import type { Reservation } from '../generated/prisma/client.js';

export function receipt(booking: Reservation) {
  return {
    id: booking.id,
    reservationNumber: booking.reservationNumber,
    status: booking.status,
    paymentPreference: booking.paymentPreference,
    expectedArrivalAt: booking.expectedArrivalAt,
    firstContactedAt: booking.firstContactedAt,
    responseDeadlineAt: booking.responseDeadlineAt,
    holdExpiresAt: booking.holdExpiresAt,
    confirmedAt: booking.confirmedAt,
  };
}
