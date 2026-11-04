import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  bookingDeadlineReached,
  expectedGuestArrival,
  initialGuestBookingTiming,
  payAtPropertyDeadlines,
} from './guest-booking-policy.js';

const ONLINE_HOLD_MS = 15 * 60 * 1000;

describe('guest booking timing policy', () => {
  it('interprets arrival time in Philippine time', () => {
    const arrival = expectedGuestArrival(
      '2026-11-12',
      '14:00',
      new Date('2026-11-10T04:00:00.000Z'),
    );

    expect(arrival.toISOString()).toBe(
      '2026-11-12T06:00:00.000Z',
    );
  });

  it('rejects an impossible check-in date', () => {
    expect(() =>
      expectedGuestArrival(
        '2026-02-30',
        '14:00',
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    ).toThrow();
  });

  it('rejects an invalid arrival time', () => {
    expect(() =>
      expectedGuestArrival(
        '2026-11-12',
        '24:00',
        new Date('2026-11-10T04:00:00.000Z'),
      ),
    ).toThrow();
  });

  it('rejects an arrival that has already passed', () => {
    expect(() =>
      expectedGuestArrival(
        '2026-11-10',
        '11:00',
        new Date('2026-11-10T04:00:00.000Z'),
      ),
    ).toThrow();
  });

  it('sets the initial property deadline to arrival plus 30 minutes', () => {
    const result = initialGuestBookingTiming(
      {
        checkIn: '2026-11-12',
        arrivalTime: '14:00',
        paymentPreference: 'PAY_AT_PROPERTY',
      },
      new Date('2026-11-10T04:00:00.000Z'),
      ONLINE_HOLD_MS,
    );

    expect(result.holdExpiresAt.toISOString()).toBe(
      '2026-11-12T06:30:00.000Z',
    );
  });

  it('uses the 24-hour response deadline when it is earlier', () => {
    const result = payAtPropertyDeadlines(
      new Date('2026-11-12T06:00:00.000Z'),
      new Date('2026-11-10T04:00:00.000Z'),
    );

    expect(
      result.responseDeadlineAt?.toISOString(),
    ).toBe('2026-11-11T04:00:00.000Z');

    expect(result.holdExpiresAt.toISOString()).toBe(
      '2026-11-11T04:00:00.000Z',
    );

    expect(result.cancellationReason).toBe(
      'GUEST_RESPONSE_EXPIRED',
    );
  });

  it('uses arrival grace when it is earlier than the response deadline', () => {
    const result = payAtPropertyDeadlines(
      new Date('2026-11-10T06:00:00.000Z'),
      new Date('2026-11-10T04:00:00.000Z'),
    );

    expect(result.holdExpiresAt.toISOString()).toBe(
      '2026-11-10T06:30:00.000Z',
    );

    expect(result.cancellationReason).toBe(
      'ARRIVAL_GRACE_EXPIRED',
    );
  });

  it('handles arrival grace crossing midnight', () => {
    const result = payAtPropertyDeadlines(
      new Date('2026-11-12T15:50:00.000Z'),
      null,
    );

    expect(result.holdExpiresAt.toISOString()).toBe(
      '2026-11-12T16:20:00.000Z',
    );
  });

  it('uses the online hold duration from creation time', () => {
    const result = initialGuestBookingTiming(
      {
        checkIn: '2026-11-12',
        arrivalTime: '14:00',
        paymentPreference: 'PAYMONGO',
      },
      new Date('2026-11-10T04:00:00.000Z'),
      ONLINE_HOLD_MS,
    );

    expect(result.holdExpiresAt.toISOString()).toBe(
      '2026-11-10T04:15:00.000Z',
    );
  });

  it('does not consider a deadline reached one millisecond early', () => {
    expect(
      bookingDeadlineReached(
        new Date('2026-11-12T06:30:00.000Z'),
        new Date('2026-11-12T06:29:59.999Z'),
      ),
    ).toBe(false);
  });

  it('considers the deadline reached at the exact boundary', () => {
    expect(
      bookingDeadlineReached(
        new Date('2026-11-12T06:30:00.000Z'),
        new Date('2026-11-12T06:30:00.000Z'),
      ),
    ).toBe(true);
  });
});