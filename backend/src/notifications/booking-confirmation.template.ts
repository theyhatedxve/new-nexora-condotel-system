import type { Reservation } from '../generated/prisma/client.js';

type ConfirmationBooking = Pick<
  Reservation,
  | 'id'
  | 'reservationNumber'
  | 'confirmedAt'
  | 'rentalType'
  | 'scheduledArrivalAt'
  | 'scheduledDepartureAt'
  | 'checkInDate'
  | 'checkOutDate'
  | 'totalAmountCentavos'
  | 'paymentPreference'
> & { roomType: { name: string } };

export function guestWebBaseUrl(): URL {
  const configured = process.env.NEXORA_GUEST_WEB_URL;
  if (!configured) {
    throw new Error('Guest website URL is not configured.');
  }

  const url = new URL(configured);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash ||
    url.pathname !== '/' ||
    (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
  ) {
    throw new Error('Guest website URL configuration is invalid.');
  }
  return url;
}

function timestamp(value: Date) {
  if (!Number.isFinite(value.getTime())) {
    throw new Error('Invalid booking timestamp.');
  }
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export function buildConfirmationEmail(booking: ConfirmationBooking, baseUrl: URL) {
  if (
    !booking.confirmedAt ||
    !Number.isSafeInteger(booking.totalAmountCentavos) ||
    booking.totalAmountCentavos < 1
  ) {
    throw new Error('Booking confirmation details require review.');
  }

  const total = new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP',
  }).format(booking.totalAmountCentavos / 100);
  let arrival: string;
  let departure: string;

  if (booking.rentalType) {
    if (!booking.scheduledArrivalAt || !booking.scheduledDepartureAt) {
      throw new Error('Scheduled rental timing requires review.');
    }
    arrival = timestamp(booking.scheduledArrivalAt);
    departure = timestamp(booking.scheduledDepartureAt);
  } else {
    arrival = booking.checkInDate.toISOString().slice(0, 10);
    departure = booking.checkOutDate.toISOString().slice(0, 10);
  }

  const bookingUrl = new URL('/my-bookings/' + encodeURIComponent(booking.id), baseUrl);
  const method = booking.paymentPreference === 'PAY_AT_PROPERTY'
    ? 'Pay at Property' : 'PayMongo test checkout';

  return {
    subject: 'Your NEXORA reservation confirmation',
    text: [
      'Your NEXORA reservation confirmation was recorded.',
      '',
      `Booking reference: ${booking.reservationNumber}`,
      `Confirmed: ${timestamp(booking.confirmedAt)} (Philippine time)`,
      `Room type: ${booking.roomType.name}`,
      `Scheduled arrival: ${arrival}`,
      `Scheduled departure: ${departure}`,
      `Original booked stay total: ${total}`,
      `Payment method: ${method}`,
      '',
      'Sign in to review your current reservation and recorded payments:',
      bookingUrl.toString(),
      '',
      'Reception will verify your arrival and complete check-in.',
      'Contact the property if any booking detail needs correction.',
    ].join('\n'),
  };
}
