import {
  ConflictException,
} from '@nestjs/common';

import type {
  Payment,
  Refund,
  ReservationStatus,
} from '../generated/prisma/client.js';

import {
  hasPaymentReview,
  hasVerifiedPaymongoEvidence,
  type PaymentEvidence,
} from './payment-evidence.js';

export type SummaryPayment = Pick<
  Payment,
  | 'method'
  | 'status'
  | 'amountCentavos'
  | 'currency'
  | 'paidAt'
  | 'provider'
  | 'providerCheckoutId'
  | 'providerPaymentId'
> & {
  id?: string;
  events?: PaymentEvidence[];
  refunds: Pick<
    Refund,
    'amountCentavos' | 'status'
  >[];
};

export type BookingPaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'REFUNDED'
  | 'REVIEW_REQUIRED';

function review(): never {
  throw new ConflictException(
    'Payment records require financial review.',
  );
}

function money(value: number): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    review();
  }

  return value;
}

// Pure calculation:
// no database writes or external requests.
export function calculatePaymentSummary(
  bookedTotalCentavos: number,
  reservationStatus: ReservationStatus,
  payments: readonly SummaryPayment[],
  now = new Date(),
) {
  money(bookedTotalCentavos);

  if (!Number.isFinite(now.getTime())) {
    review();
  }

  let collected = 0;
  let refunded = 0;
  let pendingRefund = 0;

  for (const payment of payments) {
    // This legacy receipt status does not clearly
    // identify how much was actually collected.
    if (payment.status === 'PARTIALLY_PAID') {
      review();
    }

    const settled = [
      'PAID',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
    ].includes(payment.status);

    if (!settled) {
      const hasFinancialRefund =
        payment.refunds.some(
          (refund) =>
            refund.status === 'PENDING' ||
            refund.status === 'COMPLETED',
        );

      if (
        payment.paidAt ||
        hasFinancialRefund
      ) {
        review();
      }

      continue;
    }

    const verifiedMethod = payment.method === 'PAY_AT_PROPERTY'
      ? !payment.provider && !payment.providerCheckoutId && !payment.providerPaymentId
      : payment.method === 'PAYMONGO' && hasVerifiedPaymongoEvidence(payment);

    if (
      !verifiedMethod ||
      payment.currency !== 'PHP' ||
      !payment.paidAt ||
      !Number.isFinite(
        payment.paidAt.getTime(),
      ) ||
      payment.paidAt > now ||
      money(payment.amountCentavos) === 0
    ) {
      review();
    }

    let completed = 0;
    let pending = 0;

    for (const refund of payment.refunds) {
      if (
        money(refund.amountCentavos) === 0
      ) {
        review();
      }

      if (refund.status === 'COMPLETED') {
        completed = money(
          completed +
            refund.amountCentavos,
        );
      }

      if (refund.status === 'PENDING') {
        pending = money(
          pending +
            refund.amountCentavos,
        );
      }
    }

    const exceedsCollection =
      money(completed + pending) >
      payment.amountCentavos;

    const inconsistentPaid =
      payment.status === 'PAID' &&
      completed !== 0;

    const inconsistentPartialRefund =
      payment.status === 'PARTIALLY_REFUNDED' &&
      (
        completed <= 0 ||
        completed >= payment.amountCentavos
      );

    const inconsistentFullRefund =
      payment.status === 'REFUNDED' &&
      completed !== payment.amountCentavos;

    if (
      exceedsCollection ||
      inconsistentPaid ||
      inconsistentPartialRefund ||
      inconsistentFullRefund
    ) {
      review();
    }

    collected = money(
      collected +
        payment.amountCentavos,
    );

    refunded = money(
      refunded + completed,
    );

    pendingRefund = money(
      pendingRefund + pending,
    );
  }

  const netPaid = money(
    collected - refunded,
  );

  const closed = [
    'CANCELLED',
    'EXPIRED',
    'CHECKED_OUT',
  ].includes(reservationStatus);

  const cancelledOrExpired = [
    'CANCELLED',
    'EXPIRED',
  ].includes(reservationStatus);

  const requiresReview =
    payments.some(hasPaymentReview) ||
    pendingRefund > 0 ||
    netPaid > bookedTotalCentavos ||
    (
      cancelledOrExpired &&
      payments.length > 0
    ) ||
    (
      reservationStatus === 'CHECKED_OUT' &&
      netPaid !== bookedTotalCentavos
    );

  let status: BookingPaymentStatus =
    'UNPAID';

  if (requiresReview) {
    status = 'REVIEW_REQUIRED';
  } else if (
    refunded > 0 &&
    netPaid === 0
  ) {
    status = 'REFUNDED';
  } else if (
    netPaid >= bookedTotalCentavos
  ) {
    status = 'PAID';
  } else if (netPaid > 0) {
    status = 'PARTIALLY_PAID';
  }

  return {
    currency: 'PHP' as const,
    bookedTotalCentavos,

    hasPendingPayment: payments.some(
      (payment) =>
        payment.status === 'PENDING',
    ),

    collectedCentavos: collected,
    refundedCentavos: refunded,
    pendingRefundCentavos: pendingRefund,
    netPaidCentavos: netPaid,

    // Closed booking history must not automatically
    // become a new debt or refund obligation.
    balanceDueCentavos: closed
      ? null
      : Math.max(
          bookedTotalCentavos - netPaid,
          0,
        ),

    overpaidCentavos: closed
      ? null
      : Math.max(
          netPaid - bookedTotalCentavos,
          0,
        ),

    status,
    requiresReview,
  };
}
