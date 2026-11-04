import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import type {
  Prisma,
  ReservationStatus,
} from '../generated/prisma/client.js';

import {
  ARRIVAL_GRACE_MS,
  GUEST_BOOKING_POLICY_VERSION,
} from './guest-booking-policy.js';

const transitions: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function assertReservationTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): void {
  if (!transitions[from]?.includes(to)) {
    throw new ConflictException(
      `Transition from ${from} to ${to} is not permitted.`,
    );
  }
}

export const MAX_EXPIRATION_BATCH = 100;

interface ExpirationOptions {
  propertyId: string;
  now: Date;
  roomTypeId?: string;
  reservationId?: string;
  limit?: number;
  actorUserId?: string;
}

function propertyCancellationReason(hold: {
  holdExpiresAt: Date;
  expectedArrivalAt: Date | null;
  responseDeadlineAt: Date | null;
}) {
  const arrivalDeadline =
    hold.expectedArrivalAt === null
      ? null
      : new Date(
          hold.expectedArrivalAt.getTime() +
            ARRIVAL_GRACE_MS,
        );

  const responseWins =
    hold.responseDeadlineAt !== null &&
    (
      arrivalDeadline === null ||
      hold.responseDeadlineAt < arrivalDeadline
    );

  const expectedDeadline = responseWins
    ? hold.responseDeadlineAt
    : arrivalDeadline;

  if (
    expectedDeadline === null ||
    expectedDeadline.getTime() !==
      hold.holdExpiresAt.getTime()
  ) {
    return 'PENDING_CONFIRMATION_DEADLINE_EXPIRED';
  }

  return responseWins
    ? 'GUEST_RESPONSE_EXPIRED'
    : 'ARRIVAL_GRACE_EXPIRED';
}

export async function expirePendingHoldsInTx(
  tx: Prisma.TransactionClient,
  {
    propertyId,
    now,
    roomTypeId,
    reservationId,
    limit = MAX_EXPIRATION_BATCH,
    actorUserId,
  }: ExpirationOptions,
) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_EXPIRATION_BATCH
  ) {
    throw new BadRequestException(
      `Expiration batch must be from 1 to ${MAX_EXPIRATION_BATCH}.`,
    );
  }

  if (!Number.isFinite(now.getTime())) {
    throw new BadRequestException(
      'Invalid expiration time.',
    );
  }

    const where: Prisma.ReservationWhereInput = {
    status: 'PENDING',
    holdExpiresAt: {
      lte: now,
    },
    roomType: {
      propertyId,
    },
    ...(roomTypeId ? { roomTypeId } : {}),
    ...(reservationId ? { id: reservationId } : {}),
  };

  const holds = await tx.reservation.findMany({
    where,
    select: {
      id: true,
      holdExpiresAt: true,
      bookingPolicyVersion: true,
      paymentPreference: true,
      expectedArrivalAt: true,
      responseDeadlineAt: true,
    },
    orderBy: [
      { holdExpiresAt: 'asc' },
      { id: 'asc' },
    ],
    take: limit,
  });

  let expiredCount = 0;
  let cancelledCount = 0;
  let releasedAssignmentCount = 0;

  for (const hold of holds) {
    if (hold.holdExpiresAt === null) {
      continue;
    }

    const propertyConfirmation =
      hold.bookingPolicyVersion ===
        GUEST_BOOKING_POLICY_VERSION &&
      hold.paymentPreference ===
        'PAY_AT_PROPERTY';

    const target: ReservationStatus =
      propertyConfirmation
        ? 'CANCELLED'
        : 'EXPIRED';

    assertReservationTransition(
      'PENDING',
      target,
    );

    const claimed =
      await tx.reservation.updateMany({
        where: {
          id: hold.id,
          status: 'PENDING',
          bookingPolicyVersion:
            hold.bookingPolicyVersion,
          paymentPreference:
            hold.paymentPreference,
          holdExpiresAt: {
            equals: hold.holdExpiresAt,
            lte: now,
          },
        },
        data: {
          status: target,
        },
      });

    if (claimed.count !== 1) {
      continue;
    }

    const released =
      await tx.roomAssignment.updateMany({
        where: {
          reservationId: hold.id,
          releasedAt: null,
        },
        data: {
          releasedAt: now,
        },
      });

    const details = propertyConfirmation
      ? {
          policyVersion:
            hold.bookingPolicyVersion,
          paymentPreference:
            hold.paymentPreference,
          reason: propertyCancellationReason({
            holdExpiresAt:
              hold.holdExpiresAt,
            expectedArrivalAt:
              hold.expectedArrivalAt,
            responseDeadlineAt:
              hold.responseDeadlineAt,
          }),
          holdExpiresAt:
            hold.holdExpiresAt.toISOString(),
          releasedAssignmentCount:
            released.count,
        }
      : {
          holdExpiresAt:
            hold.holdExpiresAt.toISOString(),
          releasedAssignmentCount:
            released.count,
        };

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: propertyConfirmation
          ? 'reservation.pending_confirmation_cancelled'
          : 'reservation.hold_expired',
        entityType: 'Reservation',
        entityId: hold.id,
        detailsJson: JSON.stringify(details),
      },
    });

    if (propertyConfirmation) {
      cancelledCount += 1;
    } else {
      expiredCount += 1;
    }

    releasedAssignmentCount += released.count;
  }

  const remaining =
    await tx.reservation.findFirst({
      where,
      select: {
        id: true,
      },
    });

  return {
    expiredCount,
    releasedAssignmentCount,
    hasMore: remaining !== null,
    ...(cancelledCount > 0
      ? { cancelledCount }
      : {}),
  };
}