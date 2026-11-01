import {
  ConflictException,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

// Read-only eligibility check.
// Payment creation and verification belong to Phase 7.
//
// Call inside the same transaction as the stay operation.
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
      refunds: {
        select: {
          id: true,
        },
      },
    },
  });

  const needsFinancialReview = payments.some(
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

  let paid = 0;

  const completedPayments = payments.filter(
    (payment) => payment.status === 'PAID',
  );

  for (const payment of completedPayments) {
    if (
      payment.currency !== 'PHP' ||
      !payment.paidAt ||
      payment.paidAt > now ||
      !Number.isSafeInteger(
        payment.amountCentavos,
      ) ||
      payment.amountCentavos <= 0 ||
      payment.provider ||
      payment.providerCheckoutId ||
      payment.providerPaymentId
    ) {
      throw new ConflictException(
        'A paid record is incomplete or requires financial review.',
      );
    }

    paid += payment.amountCentavos;
  }

  if (
    !Number.isSafeInteger(
      totalAmountCentavos,
    ) ||
    totalAmountCentavos <= 0 ||
    !Number.isSafeInteger(paid) ||
    paid < totalAmountCentavos
  ) {
    throw new ConflictException(
      'Full recorded payment is required. Payment recording is implemented in Phase 7.',
    );
  }

  return paid;
}