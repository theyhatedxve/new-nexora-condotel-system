import { ConflictException } from '@nestjs/common';
import type { Refund, Reservation } from '../generated/prisma/client.js';
import {
  calculatePaymentSummary,
  type SummaryPayment,
} from '../payments/summary/payment-summary.js';

type RefundBooking = Pick<
  Reservation,
  'id' | 'reservationNumber' | 'status' | 'totalAmountCentavos'
> & {
  roomType: { name: string };
};

type RefundPayment = Omit<SummaryPayment, 'refunds'> & {
  id: string;
  refunds: Refund[];
};

function pesos(centavos: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(centavos / 100);
}

function paymentSummary(
  total: number,
  status: Reservation['status'],
  payments: SummaryPayment[],
  now: Date,
): ReturnType<typeof calculatePaymentSummary> | null {
  try {
    return calculatePaymentSummary(total, status, payments, now);
  } catch (error) {
    if (!(error instanceof ConflictException)) throw error;
    return null;
  }
}

export function buildRefundCompletionEmail(
  booking: RefundBooking,
  payments: RefundPayment[],
  refundId: string,
  baseUrl: URL,
  now: Date,
): { subject: string; text: string } {
  const payment = payments.find((entry) =>
    entry.refunds.some((refund) => refund.id === refundId),
  );
  const refund = payment?.refunds.find((entry) => entry.id === refundId);

  if (
    !payment ||
    !refund ||
    refund.status !== 'COMPLETED' ||
    !refund.processedByUserId ||
    !refund.completedAt ||
    !Number.isFinite(refund.completedAt.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    refund.completedAt > now ||
    !Number.isSafeInteger(refund.amountCentavos) ||
    refund.amountCentavos < 1
  ) {
    throw new Error('Completed refund details are unavailable.');
  }

  const propertyRefund = payment.method === 'PAY_AT_PROPERTY';
  const supportedMethod = propertyRefund
    ? !refund.providerRefundId
    : payment.method === 'PAYMONGO' &&
      /^ref_[A-Za-z0-9_]{1,96}$/.test(refund.providerRefundId ?? '');

  // Validate the refunded payment independently of other booking payments.
  const receipt = supportedMethod
    ? paymentSummary(payment.amountCentavos, 'CONFIRMED', [payment], now)
    : null;
  const summary = paymentSummary(
    booking.totalAmountCentavos, booking.status, payments, now,
  );
  const verifiedReceipt = receipt !== null;
  const requiresReview =
    !verifiedReceipt || receipt.requiresReview || !summary || summary.requiresReview;

  const details = verifiedReceipt
    ? [
        'The following refund is recorded as completed in NEXORA.',
        `Refund amount: ${pesos(refund.amountCentavos)}`,
        `Refund method: ${propertyRefund ? 'Pay at Property' : 'PayMongo test refund'}`,
        `Completion recorded: ${new Intl.DateTimeFormat('en-PH', {
          timeZone: 'Asia/Manila',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(refund.completedAt)} (Philippine time)`,
        propertyRefund
          ? 'Reception recorded that the money was returned.'
          : 'PayMongo test-mode completion was recorded. This prototype does not confirm real bank settlement.',
      ]
    : [
        'The recorded refund requires financial review.',
        'This email does not verify a completed refund or its amount.',
        'Contact the property for clarification.',
      ];

  return {
    subject: verifiedReceipt
      ? 'Your NEXORA refund completion'
      : 'Your NEXORA refund update',
    text: [
      'There is an update to a refund for your NEXORA reservation.',
      '',
      `Booking reference: ${booking.reservationNumber}`,
      `Room type: ${booking.roomType.name}`,
      `Current reservation status: ${booking.status}`,
      '',
      ...details,
      '',
      `Current booking payment status: ${requiresReview ? 'REVIEW_REQUIRED' : summary!.status}`,
      ...(requiresReview
        ? [
            'The current financial records require review.',
            'Contact the property before making another payment.',
          ]
        : [
            `Current total refunded: ${pesos(summary!.refundedCentavos)}`,
            `Current net paid amount: ${pesos(summary!.netPaidCentavos)}`,
          ]),
      '',
      'Refund completion and reservation status are separate.',
      'This notice does not confirm a reservation cancellation.',
      'Security-deposit returns are recorded separately.',
      'Information reflects the records available when this email was prepared.',
      '',
      'Sign in to review your current booking:',
      new URL('/my-bookings/' + encodeURIComponent(booking.id), baseUrl).toString(),
      '',
      'Contact the property if any detail needs correction.',
    ].join('\n'),
  };
}
