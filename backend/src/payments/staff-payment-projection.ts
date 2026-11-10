import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

import { calculatePaymentSummary } from './payment-summary.js';
import { paymentEvidenceSelect } from './payment-evidence.js';

export const roles = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;

export const financialFields = {
  id: true,
  method: true,
  status: true,
  amountCentavos: true,
  currency: true,
  paidAt: true,
  provider: true,
  providerCheckoutId: true,
  providerPaymentId: true,
  events: {
    select: paymentEvidenceSelect,
  },
  refunds: {
    select: {
      amountCentavos: true,
      status: true,
    },
  },
} as const;

export const fields = {
  ...financialFields,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      id: true,
      reservationNumber: true,
      status: true,
      totalAmountCentavos: true,
    },
  },
} as const;

export type StaffPayment = Prisma.PaymentGetPayload<{
  select: typeof fields;
}>;

export function projectStaffPayment(payment: StaffPayment) {
  let collection: {
    collectedCentavos: number;
    refundedCentavos: number;
    pendingRefundCentavos: number;
    netPaidCentavos: number;
  } | null = null;

  let verification:
    | 'VERIFIED_COLLECTION'
    | 'NOT_COLLECTED'
    | 'REVIEW_REQUIRED' = 'REVIEW_REQUIRED';

  try {
    if (
      payment.currency !== 'PHP' ||
      !Number.isSafeInteger(payment.amountCentavos) ||
      payment.amountCentavos <= 0
    ) {
      throw new ConflictException(
        'Payment records require financial review.',
      );
    }

    // Calculate this receipt independently of booking eligibility.
    // Booking-level obligations are calculated separately in detail().
    const receipt = calculatePaymentSummary(
      payment.amountCentavos,
      'CONFIRMED',
      [payment],
    );

    const closedWithoutStay = [
      'CANCELLED',
      'EXPIRED',
    ].includes(payment.reservation.status);

    if (!receipt.requiresReview && !closedWithoutStay) {
      verification = receipt.collectedCentavos > 0
        ? 'VERIFIED_COLLECTION'
        : 'NOT_COLLECTED';

      collection = {
        collectedCentavos: receipt.collectedCentavos,
        refundedCentavos: receipt.refundedCentavos,
        pendingRefundCentavos:
          receipt.pendingRefundCentavos,
        netPaidCentavos: receipt.netPaidCentavos,
      };
    }
  } catch (error) {
    if (!(error instanceof ConflictException)) {
      throw error;
    }
  }

  return {
    id: payment.id,
    method: payment.method,
    status: payment.status,
    amountCentavos: payment.amountCentavos,
    currency: payment.currency,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    verification,
    requiresReview: verification === 'REVIEW_REQUIRED',
    collection,
    reservation: {
      id: payment.reservation.id,
      reservationNumber:
        payment.reservation.reservationNumber,
      status: payment.reservation.status,
    },
  };
}
