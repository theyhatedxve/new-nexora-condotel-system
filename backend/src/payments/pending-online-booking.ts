import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type {
  Prisma,
  Reservation,
} from '../generated/prisma/client.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  GUEST_BOOKING_POLICY_VERSION,
} from '../reservations/guest-booking-policy.js';

import {
  assertInventoryCommitments,
} from '../reservations/inventory-write.js';

import {
  hasPaymentReview,
  paymentEvidenceSelect,
} from './payment-evidence.js';

type CheckoutBooking = Pick<
  Reservation,
  | 'status'
  | 'bookingPolicyVersion'
  | 'paymentPreference'
  | 'expectedArrivalAt'
  | 'holdExpiresAt'
  | 'checkOutDate'
>;

export function isPendingOnlineBooking(
  booking: CheckoutBooking,
): boolean {
  return (
    booking.status === 'PENDING' &&
    booking.bookingPolicyVersion ===
      GUEST_BOOKING_POLICY_VERSION &&
    booking.paymentPreference === 'PAYMONGO'
  );
}

export function assertCheckoutBookingEligible(
  booking: CheckoutBooking,
  now = new Date(),
): void {
  if (
    !Number.isFinite(now.getTime()) ||
    booking.checkOutDate <= todayInPhilippines()
  ) {
    throw new ConflictException(
      'Checkout requires remaining stay dates.',
    );
  }

  if (booking.status === 'CONFIRMED') {
    return;
  }

  if (
    isPendingOnlineBooking(booking) &&
    booking.expectedArrivalAt !== null &&
    booking.holdExpiresAt !== null &&
    booking.holdExpiresAt > now
  ) {
    return;
  }

  throw new ConflictException(
    'Checkout requires a confirmed booking or an active online booking hold.',
  );
}

export async function confirmPendingOnlineBookingInTx(
  tx: Prisma.TransactionClient,
  paymentId: string,
  providerEventId: string,
  providerCreatedAt: Date,
): Promise<boolean> {
  const payment = await tx.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      reservation: {
        include: {
          payments: {
            include: {
              refunds: true,
              events: {
                select: paymentEvidenceSelect,
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return false;
  }

  const booking = payment.reservation;
  const now = new Date();

  if (
    !isPendingOnlineBooking(booking) ||
    !booking.expectedArrivalAt ||
    !booking.holdExpiresAt ||
    booking.holdExpiresAt <= now ||
    booking.checkOutDate <= todayInPhilippines() ||
    payment.status !== 'PAID' ||
    payment.method !== 'PAYMONGO' ||
    payment.provider !== 'PAYMONGO' ||
    payment.currency !== 'PHP' ||
    !payment.providerCheckoutId ||
    !payment.providerPaymentId ||
    !payment.checkoutRequestKeyHash ||
    !payment.checkoutRequestFingerprint ||
    payment.amountCentavos !==
      booking.totalAmountCentavos ||
    !Number.isSafeInteger(
      booking.totalAmountCentavos,
    ) ||
    booking.totalAmountCentavos <= 0 ||
    booking.payments.length !== 1 ||
    booking.payments[0].id !== payment.id ||
    booking.payments.some(
      (row) =>
        row.refunds.length > 0 ||
        hasPaymentReview(row),
    )
  ) {
    return false;
  }

  const eventTime = providerCreatedAt.getTime();

  const earliestEventTime =
    Math.floor(
      payment.createdAt.getTime() / 1000,
    ) * 1000;

  if (
    !Number.isFinite(eventTime) ||
    eventTime < earliestEventTime ||
    eventTime > now.getTime() + 1000 ||
    eventTime >= booking.holdExpiresAt.getTime()
  ) {
    return false;
  }

  try {
    await assertInventoryCommitments(
      tx,
      [booking.roomTypeId],
    );
  } catch (error) {
    if (
      error instanceof ConflictException ||
      error instanceof ServiceUnavailableException
    ) {
      return false;
    }

    throw error;
  }

  const confirmedAt = new Date();

  if (booking.holdExpiresAt <= confirmedAt) {
    return false;
  }

  const changed = await tx.reservation.updateMany({
    where: {
      id: booking.id,
      status: 'PENDING',
      bookingPolicyVersion:
        GUEST_BOOKING_POLICY_VERSION,
      paymentPreference: 'PAYMONGO',
      holdExpiresAt: {
        equals: booking.holdExpiresAt,
        gt: confirmedAt,
      },
    },
    data: {
      status: 'CONFIRMED',
      confirmedAt,
      holdExpiresAt: null,
    },
  });

  if (changed.count !== 1) {
    throw new Error(
      'Concurrent online booking confirmation change.',
    );
  }

  await tx.auditLog.create({
    data: {
      actorUserId: null,
      action:
        'reservation.online_payment_confirmed',
      entityType: 'Reservation',
      entityId: booking.id,
      detailsJson: JSON.stringify({
        policyVersion:
          GUEST_BOOKING_POLICY_VERSION,
        paymentPreference: 'PAYMONGO',
        paymentId: payment.id,
        providerEventId,
        confirmedAt:
          confirmedAt.toISOString(),
      }),
    },
  });

  return true;
}