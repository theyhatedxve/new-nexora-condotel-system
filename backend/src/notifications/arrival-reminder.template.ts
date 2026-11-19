import type { ReminderBooking } from '../reservations/policies/booking-reminder.policy.js';
import { arrivalReminderDue, arrivalReminderKey } from '../reservations/policies/booking-reminder.policy.js';

type ArrivalBooking = ReminderBooking & {
  id: string; reservationNumber: string; roomType: { name: string };
};

export function buildArrivalReminderEmail(
  booking: ArrivalBooking, templateKey: string, baseUrl: URL, now: Date,
): { subject: string; text: string } {
  const arrival = arrivalReminderDue(booking, now);
  if (!arrival || arrivalReminderKey(arrival) !== templateKey) {
    throw new Error('The arrival reminder is no longer applicable.');
  }
  const arrivalText = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(arrival);
  return {
    subject: 'Your upcoming NEXORA arrival',
    text: [
      'Your NEXORA arrival is coming up.', '',
      `Booking reference: ${booking.reservationNumber}`,
      `Room type: ${booking.roomType.name}`,
      `Expected arrival: ${arrivalText} (Philippine time)`,
      'Current reservation status: CONFIRMED', '',
      'Contact the property if your arrival plans change.',
      'Reception will review your reservation and complete check-in.',
      'This reminder does not change your booking or payment deadlines.',
      'It does not confirm payment or check-in.', '',
      'Sign in to review your current booking:',
      new URL('/my-bookings/' + encodeURIComponent(booking.id), baseUrl).toString(),
    ].join('\n'),
  };
}
