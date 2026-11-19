import { ConflictException } from '@nestjs/common';
import type { Reservation } from '../generated/prisma/client.js';
import {
  calculatePaymentSummary,
  type SummaryPayment,
} from '../payments/summary/payment-summary.js';

type UpdateBooking = Pick<
  Reservation,
  'id' | 'reservationNumber' | 'status' | 'totalAmountCentavos'
> & {
  roomType: { name: string };
};

function bookingDetails(booking: UpdateBooking): string[] {
  return [
    `Booking reference: ${booking.reservationNumber}`,
    `Room type: ${booking.roomType.name}`,
    `Current reservation status: ${booking.status}`,
  ];
}

function bookingLink(booking: UpdateBooking, baseUrl: URL): string[] {
  return [
    '',
    'Sign in to review the latest reservation and payment information:',
    new URL('/my-bookings/' + encodeURIComponent(booking.id), baseUrl).toString(),
    '',
    'Contact the property if any detail needs correction.',
  ];
}

function pesos(centavos: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(centavos / 100);
}

export function buildPaymentUpdateEmail(
  booking: UpdateBooking,
  payments: SummaryPayment[],
  paymentId: string,
  baseUrl: URL,
  now: Date,
): { subject: string; text: string } {
  const payment = payments.find((entry) => entry.id === paymentId);

  if (
    !payment ||
    !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status)
  ) {
    throw new Error('Recorded payment is unavailable.');
  }

  let summary: ReturnType<typeof calculatePaymentSummary> | null = null;
  try {
    summary = calculatePaymentSummary(
      booking.totalAmountCentavos, booking.status, payments, now,
    );
  } catch (error) {
    if (!(error instanceof ConflictException)) throw error;
  }

  const requiresReview = !summary || summary.requiresReview;
  const financialDetails: string[] = requiresReview
    ? [
        'Payment status: REVIEW_REQUIRED',
        'The recorded payment requires financial review.',
        'This email does not confirm that the reservation is active or fully paid.',
        'Contact the property before making another payment.',
      ]
    : [
        `Payment record status: ${payment.status}`,
        `Recorded payment amount: ${pesos(payment.amountCentavos)}`,
        `Payment method: ${payment.method === 'PAY_AT_PROPERTY'
          ? 'Pay at Property' : 'PayMongo test checkout'}`,
        `Current booking payment status: ${summary!.status}`,
        `Current net paid amount: ${pesos(summary!.netPaidCentavos)}`,
        ...(summary!.balanceDueCentavos === null ? [] : [
          `Current booked-stay balance: ${pesos(summary!.balanceDueCentavos)}`,
        ]),
      ];

  return {
    subject: 'Your NEXORA payment update',
    text: [
      'There is an update to a payment recorded for your NEXORA reservation.',
      '',
      ...bookingDetails(booking),
      '',
      ...financialDetails,
      '',
      'Payment recording and reservation confirmation are separate.',
      'Amounts shown concern the booked stay; review other charges with reception.',
      'Information reflects the records available when this email was prepared.',
      ...bookingLink(booking, baseUrl),
    ].join('\n'),
  };
}

export function buildCancellationEmail(
  booking: UpdateBooking,
  baseUrl: URL,
): { subject: string; text: string } {
  if (booking.status !== 'CANCELLED') {
    throw new Error('The reservation is no longer cancelled.');
  }
  return {
    subject: 'Your NEXORA reservation cancellation',
    text: [
      'Your NEXORA reservation has been cancelled.',
      '',
      ...bookingDetails(booking),
      '',
      'This notice confirms the reservation cancellation.',
      'Any recorded payment or refund must be reviewed separately.',
      'This email does not promise or confirm a refund.',
      ...bookingLink(booking, baseUrl),
    ].join('\n'),
  };
}
