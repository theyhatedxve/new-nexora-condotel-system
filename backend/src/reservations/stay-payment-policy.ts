import {
  ConflictException,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import {
  calculatePaymentSummary,
} from '../payments/payment-summary.js';

export async function requireFullRecordedPayment(
  tx: Prisma.TransactionClient,
  reservationId: string,
  totalAmountCentavos: number,
  now: Date,
): Promise<number> {
  const payments = await tx.payment.findMany({
    where: {
      reservationId,
    },
    include: {
      refunds: true,
    },
  });

  const needsFinancialReview =
    payments.some(
      (payment) =>
        payment.method !== 'PAY_AT_PROPERTY' ||
        payment.refunds.length > 0 ||
        [
          'PARTIALLY_PAID',
          'PARTIALLY_REFUNDED',
          'REFUNDED',
        ].includes(payment.status),
    );

  if (needsFinancialReview) {
    throw new ConflictException(
      'These payment records require Phase 7 financial review.',
    );
  }

  const summary =
    calculatePaymentSummary(
      totalAmountCentavos,
      'CONFIRMED',
      payments,
      now,
    );

  if (
    totalAmountCentavos <= 0 ||
    summary.requiresReview ||
    summary.balanceDueCentavos !== 0
  ) {
    throw new ConflictException(
      'Full recorded payment is required. Payment recording is implemented in Phase 7.',
    );
  }

  return summary.netPaidCentavos;
}