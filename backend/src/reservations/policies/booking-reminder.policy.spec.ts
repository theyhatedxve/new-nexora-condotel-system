import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  WEEK_MS,
  arrivalReminderDue,
  arrivalReminderKey,
  dueContactReminder,
  type ReminderBooking,
} from './booking-reminder.policy.js';

const now = new Date('2030-01-10T04:00:00Z');

function booking(arrival: Date, patch: Partial<ReminderBooking> = {}): ReminderBooking {
  return {
    status: 'CONFIRMED',
    createdAt: new Date(now.getTime() - 20 * DAY_MS),
    confirmedAt: new Date(now.getTime() - 19 * DAY_MS),
    firstContactedAt: null,
    expectedArrivalAt: arrival,
    scheduledArrivalAt: arrival,
    scheduledDepartureAt: new Date(arrival.getTime() + DAY_MS),
    inventoryEndAt: new Date(arrival.getTime() + DAY_MS),
    checkOutDate: new Date(arrival.getTime() + DAY_MS),
    actualArrivalAt: null,
    actualDepartureAt: null,
    ...patch,
  };
}

describe('booking reminder policy', () => {
  it('includes exactly twenty-four hours and excludes later or elapsed arrivals', () => {
    const exact = new Date(now.getTime() + DAY_MS);
    expect(arrivalReminderDue(booking(exact), now)).toEqual(exact);
    expect(arrivalReminderDue(booking(new Date(exact.getTime() + 1)), now)).toBeNull();
    expect(arrivalReminderDue(booking(now), now)).toBeNull();
  });

  it('uses scheduled arrival only when expected arrival is missing', () => {
    const scheduled = new Date(now.getTime() + 3600000);
    expect(arrivalReminderDue(booking(scheduled, { expectedArrivalAt: null }), now))
      .toEqual(scheduled);
    expect(arrivalReminderDue(booking(scheduled, {
      expectedArrivalAt: new Date(now.getTime() - 1),
    }), now)).toBeNull();
  });

  it('changes the email key when arrival changes', () => {
    expect(arrivalReminderKey(new Date(now.getTime() + 1000)))
      .not.toBe(arrivalReminderKey(new Date(now.getTime() + 2000)));
  });

  it('excludes closed, checked-in and already-arrived bookings', () => {
    const arrival = new Date(now.getTime() + 3600000);
    for (const status of ['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED'] as const) {
      expect(arrivalReminderDue(booking(arrival, { status }), now)).toBeNull();
    }
    expect(arrivalReminderDue(booking(arrival, { actualArrivalAt: now }), now)).toBeNull();
  });

  it('selects weekly, daily and immediate short-notice tasks', () => {
    expect(dueContactReminder(booking(new Date(now.getTime() + WEEK_MS)), [], now)?.purpose)
      .toBe('ONE_WEEK_REMINDER');
    expect(dueContactReminder(booking(new Date(now.getTime() + DAY_MS)), [], now)?.purpose)
      .toBe('ONE_DAY_REMINDER');
    expect(dueContactReminder(booking(new Date(now.getTime() + 3600000), {
      createdAt: new Date(now.getTime() - 7200000),
      confirmedAt: new Date(now.getTime() - 3600000),
    }), [], now)?.purpose).toBe('SHORT_NOTICE');
  });

  it('clears only matching reached contacts within the current due window', () => {
    const record = booking(new Date(now.getTime() + DAY_MS));
    const attempt = (purpose: string, result: string, createdAt = now) => ({
      createdAt,
      detailsJson: JSON.stringify({ version: 1, purpose, result }),
    });
    expect(dueContactReminder(record, [attempt('ONE_DAY_REMINDER', 'REACHED')], now)).toBeNull();
    for (const entry of [
      attempt('ONE_DAY_REMINDER', 'NO_ANSWER'),
      attempt('ONE_WEEK_REMINDER', 'REACHED'),
      attempt('ONE_DAY_REMINDER', 'REACHED', new Date(now.getTime() - 1)),
      attempt('ONE_DAY_REMINDER', 'REACHED', new Date(now.getTime() + 1)),
      { createdAt: now, detailsJson: '{invalid' },
    ]) {
      expect(dueContactReminder(record, [entry], now)?.purpose).toBe('ONE_DAY_REMINDER');
    }
  });

  it('does not create another immediate task after initial contact', () => {
    const record = booking(new Date(now.getTime() + 3600000), {
      createdAt: new Date(now.getTime() - 7200000),
      confirmedAt: new Date(now.getTime() - 3600000),
      firstContactedAt: new Date(now.getTime() - 5400000),
    });
    expect(dueContactReminder(record, [], now)).toBeNull();
  });
});
