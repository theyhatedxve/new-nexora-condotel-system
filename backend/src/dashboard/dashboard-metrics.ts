import { ConflictException } from '@nestjs/common';

import type {
  ReservationStatus,
} from '../generated/prisma/client.js';

import {
  parsePhilippineDate,
} from '../common/validation/philippine-date-range.js';

import {
  calculatePaymentSummary,
  type SummaryPayment,
} from '../payments/payment-summary.js';

export function dashboardPeriod(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value;

  const date =
    `${part('year')}-${part('month')}-${part('day')}`;

  const stayDate = parsePhilippineDate(date);
  const start = new Date(`${date}T00:00:00+08:00`);

  const end = new Date(
    start.getTime() + 24 * 60 * 60 * 1000,
  );

  return { date, stayDate, start, end };
}

export type FinancialBooking = {
  totalAmountCentavos: number;
  status: ReservationStatus;
  payments: Array<
    SummaryPayment & {
      refunds: Array<
        SummaryPayment['refunds'][number] & {
          completedAt: Date | null;
        }
      >;
    }
  >;
};

function safeSum(total: number, amount: number) {
  const result = total + amount;

  if (
    !Number.isSafeInteger(result) ||
    result < 0
  ) {
    throw new ConflictException(
      'Financial records require review.',
    );
  }

  return result;
}

export function financialMetrics(
  bookings: readonly FinancialBooking[],
  now: Date,
) {
  const { start, end } = dashboardPeriod(now);

  const withinDay = (date: Date) =>
    date >= start && date < end;

  let collectionsCentavos = 0;
  let refundsCentavos = 0;

  try {
    for (const booking of bookings) {
      const summary = calculatePaymentSummary(
        booking.totalAmountCentavos,
        booking.status,
        booking.payments,
        now,
      );

      if (summary.requiresReview) {
        throw new ConflictException(
          'Financial records require review.',
        );
      }

      for (const payment of booking.payments) {
        const settled = [
          'PAID',
          'PARTIALLY_REFUNDED',
          'REFUNDED',
        ].includes(payment.status);

        if (!settled) continue;

        if (
          payment.paidAt &&
          withinDay(payment.paidAt)
        ) {
          collectionsCentavos = safeSum(
            collectionsCentavos,
            payment.amountCentavos,
          );
        }

        for (const refund of payment.refunds) {
          if (refund.status !== 'COMPLETED') {
            continue;
          }

          if (
            !refund.completedAt ||
            !Number.isFinite(
              refund.completedAt.getTime(),
            ) ||
            refund.completedAt > now ||
            !payment.paidAt ||
            refund.completedAt < payment.paidAt
          ) {
            throw new ConflictException(
              'Financial records require review.',
            );
          }

          if (withinDay(refund.completedAt)) {
            refundsCentavos = safeSum(
              refundsCentavos,
              refund.amountCentavos,
            );
          }
        }
      }
    }

    const netCollectionsCentavos =
      collectionsCentavos - refundsCentavos;

    if (
      !Number.isSafeInteger(netCollectionsCentavos)
    ) {
      throw new ConflictException(
        'Financial records require review.',
      );
    }

    return {
      status: 'READY' as const,
      collectionsCentavos,
      refundsCentavos,
      netCollectionsCentavos,
    };
  } catch (error) {
    if (!(error instanceof ConflictException)) {
      throw error;
    }

    return {
      status: 'REVIEW_REQUIRED' as const,
      collectionsCentavos: null,
      refundsCentavos: null,
      netCollectionsCentavos: null,
    };
  }
}