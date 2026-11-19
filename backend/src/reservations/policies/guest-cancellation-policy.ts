import type { Reservation } from '../../generated/prisma/client.js';
import { stayHasEnded } from '../../common/inventory/reservation-window.js';
import { GUEST_BOOKING_POLICY_VERSION } from './guest-booking-policy.js';

export const GUEST_CANCELLATION_WINDOW_MS = 5 * 60 * 60 * 1000;

type Booking = Pick<Reservation,
  'status' | 'bookingPolicyVersion' | 'paymentPreference' |
  'confirmedAt' | 'checkOutDate' | 'inventoryEndAt'
>;

export function guestCancellationPolicy(
  booking: Booking,
  hasPaymentRecords: boolean,
  now = new Date(),
) {
  const supported = booking.bookingPolicyVersion === GUEST_BOOKING_POLICY_VERSION &&
    booking.paymentPreference === 'PAY_AT_PROPERTY';
  const firstConfirmedAt = supported ? booking.confirmedAt : null;
  const start = firstConfirmedAt?.getTime();
  const validStart = start !== undefined && Number.isFinite(start);
  const cancellationDeadlineAt = validStart
    ? new Date(start + GUEST_CANCELLATION_WINDOW_MS)
    : null;

  let reason = '';
  if (!supported) reason = 'Self-service cancellation applies to Pay at Property bookings.';
  else if (booking.status !== 'CONFIRMED') reason = 'Only confirmed bookings before check-in can use this cancellation.';
  else if (hasPaymentRecords) reason = 'Payment records require property review. Paid bookings cannot use voluntary cancellation.';
  else if (!cancellationDeadlineAt || !Number.isFinite(now.getTime()) || now.getTime() < start!) {
    reason = 'The first confirmation time requires property review.';
  } else if (stayHasEnded(booking, now)) reason = 'This stay has ended.';
  else if (now >= cancellationDeadlineAt) reason = 'The five-hour cancellation window has closed.';

  return {
    version: 'guest-property-cancellation-v1',
    firstConfirmedAt,
    cancellationDeadlineAt,
    cancellationFeeCentavos: 0,
    unpaidEligible: reason === '',
    reason,
    text: 'Eligible unpaid Pay at Property bookings may be cancelled without a fee before check-in and within five hours of first staff confirmation. Later reminders do not restart the window.',
  };
}
