import { BadRequestException } from '@nestjs/common';
import { enqueueBookingCancellationInTx } from '../notifications/booking-updates.queue.js';
import type { Prisma, Reservation } from '../generated/prisma/client.js';
import { GUEST_BOOKING_POLICY_VERSION } from './guest-booking-policy.js';
import { assertReservationTransition } from './reservation-lifecycle.js';

export const NO_SHOW_GRACE_MS = 60 * 60 * 1000;
export const NO_SHOW_ACTION = 'reservation.no_show_cancelled';

export function noShowDeadlineAt(expectedArrivalAt: Date | null): Date | null {
  if (!expectedArrivalAt || !Number.isFinite(expectedArrivalAt.getTime())) return null;
  const deadline = new Date(expectedArrivalAt.getTime() + NO_SHOW_GRACE_MS);
  return Number.isFinite(deadline.getTime()) ? deadline : null;
}

type NoticeBooking = Pick<Reservation,
  'id' | 'status' | 'bookingPolicyVersion' | 'paymentPreference' | 'expectedArrivalAt'
>;

export async function noShowPolicyInTx(
  tx: Prisma.TransactionClient,
  booking: NoticeBooking,
) {
  const supported = booking.bookingPolicyVersion === GUEST_BOOKING_POLICY_VERSION &&
    booking.paymentPreference === 'PAY_AT_PROPERTY';
  const event = booking.status === 'CANCELLED' ? await tx.auditLog.findFirst({
    where: { entityType: 'Reservation', entityId: booking.id, action: NO_SHOW_ACTION },
    select: { id: true },
  }) : null;
  return {
    deadlineAt: supported ? noShowDeadlineAt(booking.expectedArrivalAt) : null,
    cancelledAsNoShow: Boolean(event),
    text: 'Confirmed unpaid Pay at Property bookings may be cancelled one hour after expected arrival. Paid bookings are protected; uncertain payment records require property review. A later arrival after cancellation requires a new availability check.',
  };
}

// Call only inside withInventoryWrite. No provider calls or room-status changes.
export async function cancelUnpaidNoShowsInTx(
  tx: Prisma.TransactionClient,
  options: {
    propertyId: string;
    now: Date;
    reservationId?: string;
    actorUserId?: string;
    limit?: number;
  },
) {
  const { propertyId, now, reservationId, actorUserId, limit = 100 } = options;
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new BadRequestException('Invalid no-show processing time or batch size.');
  }
  assertReservationTransition('CONFIRMED', 'CANCELLED');
  const where: Prisma.ReservationWhereInput = {
    status: 'CONFIRMED',
    bookingPolicyVersion: GUEST_BOOKING_POLICY_VERSION,
    paymentPreference: 'PAY_AT_PROPERTY',
    confirmedAt: { not: null, lte: now },
    actualArrivalAt: null,
    expectedArrivalAt: { lte: new Date(now.getTime() - NO_SHOW_GRACE_MS) },
    payments: { none: {} },
    // Existing access must be reviewed instead of silently releasing inventory.
    cardAssignments: { none: { revokedAt: null } },
    roomType: { propertyId },
    ...(reservationId ? { id: reservationId } : {}),
  };
  const rows = await tx.reservation.findMany({
    where,
    select: { id: true, expectedArrivalAt: true },
    orderBy: [{ expectedArrivalAt: 'asc' }, { id: 'asc' }],
    take: limit,
  });
  let noShowCancelledCount = 0;
  let noShowReleasedAssignmentCount = 0;
  for (const row of rows) {
    const deadlineAt = noShowDeadlineAt(row.expectedArrivalAt);
    if (!deadlineAt || deadlineAt > now) continue;
    const changed = await tx.reservation.updateMany({
      where: { ...where, id: row.id, expectedArrivalAt: row.expectedArrivalAt },
      data: { status: 'CANCELLED' },
    });
    if (changed.count !== 1) continue;
    const released = await tx.roomAssignment.updateMany({
      where: { reservationId: row.id, releasedAt: null },
      data: { releasedAt: now },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: NO_SHOW_ACTION,
        entityType: 'Reservation',
        entityId: row.id,
        createdAt: now,
        detailsJson: JSON.stringify({
          policyVersion: 'unpaid-no-show-v1',
          reason: 'UNPAID_NO_SHOW',
          expectedArrivalAt: row.expectedArrivalAt!.toISOString(),
          deadlineAt: deadlineAt.toISOString(),
          paymentEvidence: 'NO_PAYMENT_RECORDS',
          releasedAssignmentCount: released.count,
        }),
      },
    });
    await enqueueBookingCancellationInTx(tx, row.id);
    noShowCancelledCount += 1;
    noShowReleasedAssignmentCount += released.count;
  }
  const remaining = await tx.reservation.findFirst({ where, select: { id: true } });
  return {
    noShowCancelledCount,
    noShowReleasedAssignmentCount,
    hasMoreNoShows: remaining !== null,
  };
}
