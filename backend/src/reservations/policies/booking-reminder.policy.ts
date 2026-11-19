import type { Reservation } from '../../generated/prisma/client.js';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
export const ARRIVAL_REMINDER_PREFIX = 'ARRIVAL_REMINDER:';
export const FOLLOW_UP_ACTION = 'reservation.contact_follow_up_recorded';

export type ReminderBooking = Pick<
  Reservation,
  | 'status' | 'createdAt' | 'confirmedAt' | 'firstContactedAt'
  | 'expectedArrivalAt' | 'scheduledArrivalAt' | 'scheduledDepartureAt'
  | 'inventoryEndAt' | 'checkOutDate' | 'actualArrivalAt' | 'actualDepartureAt'
>;

export type ContactAttempt = { createdAt: Date; detailsJson: string | null };
export type ContactPurpose = 'SHORT_NOTICE' | 'ONE_WEEK_REMINDER' | 'ONE_DAY_REMINDER';

export function reminderArrival(booking: ReminderBooking, now: Date): Date | null {
  const arrival = booking.expectedArrivalAt ?? booking.scheduledArrivalAt;
  const end = booking.inventoryEndAt ?? booking.scheduledDepartureAt ?? booking.checkOutDate;
  if (
    booking.status !== 'CONFIRMED' || booking.actualArrivalAt || booking.actualDepartureAt ||
    !arrival || !booking.confirmedAt ||
    ![now, arrival, end, booking.createdAt, booking.confirmedAt]
      .every((value) => Number.isFinite(value.getTime())) ||
    booking.createdAt > now || booking.confirmedAt > now || arrival <= now || end <= arrival
  ) return null;
  return arrival;
}

export function arrivalReminderKey(arrival: Date): string {
  return ARRIVAL_REMINDER_PREFIX + arrival.toISOString();
}

export function arrivalReminderDue(booking: ReminderBooking, now: Date): Date | null {
  const arrival = reminderArrival(booking, now);
  return arrival && arrival.getTime() - now.getTime() <= DAY_MS ? arrival : null;
}

export function dueContactReminder(
  booking: ReminderBooking, attempts: ContactAttempt[], now: Date,
): { purpose: ContactPurpose; dueAt: Date; expectedArrivalAt: Date } | null {
  const arrival = reminderArrival(booking, now);
  if (!arrival || arrival.getTime() - now.getTime() > WEEK_MS) return null;
  const weekAt = arrival.getTime() - WEEK_MS;
  const dayAt = arrival.getTime() - DAY_MS;
  const createdAt = booking.createdAt.getTime();
  let purpose: ContactPurpose;
  let scheduledAt: number;
  if (createdAt > dayAt) {
    purpose = 'SHORT_NOTICE'; scheduledAt = createdAt;
  } else if (now.getTime() >= dayAt) {
    purpose = 'ONE_DAY_REMINDER'; scheduledAt = dayAt;
  } else if (createdAt > weekAt) {
    purpose = 'SHORT_NOTICE'; scheduledAt = createdAt;
  } else {
    purpose = 'ONE_WEEK_REMINDER'; scheduledAt = weekAt;
  }

  // Initial contact already satisfies the immediate short-notice task.
  if (purpose === 'SHORT_NOTICE' && booking.firstContactedAt &&
      booking.firstContactedAt >= booking.createdAt && booking.firstContactedAt <= now) {
    return null;
  }
  const dueAt = new Date(Math.max(scheduledAt, booking.confirmedAt!.getTime()));
  const reached = attempts.some((attempt) => {
    if (!Number.isFinite(attempt.createdAt.getTime()) ||
        attempt.createdAt < dueAt || attempt.createdAt > now) return false;
    try {
      const details: unknown = JSON.parse(attempt.detailsJson ?? 'null');
      return Boolean(details && typeof details === 'object' && !Array.isArray(details) &&
        'version' in details && details.version === 1 &&
        'purpose' in details && details.purpose === purpose &&
        'result' in details && details.result === 'REACHED');
    } catch { return false; }
  });
  return reached ? null : { purpose, dueAt, expectedArrivalAt: arrival };
}
