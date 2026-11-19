import { describe, expect, it } from 'vitest';
import { guestCancellationPolicy } from './guest-cancellation-policy.js';
import { GUEST_BOOKING_POLICY_VERSION } from './guest-booking-policy.js';

const confirmed = new Date('2026-11-16T02:00:00.000Z');
const booking = {
  status: 'CONFIRMED' as const,
  paymentPreference: 'PAY_AT_PROPERTY' as const,
  bookingPolicyVersion: GUEST_BOOKING_POLICY_VERSION,
  confirmedAt: confirmed,
  checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
  inventoryEndAt: null,
};

describe('five-hour guest cancellation', () => {
  it('uses first confirmation, with an exclusive five-hour boundary', () => {
    const before = guestCancellationPolicy(booking, false, new Date('2026-11-16T06:59:59.999Z'));
    expect(before.unpaidEligible).toBe(true);
    expect(before.cancellationDeadlineAt?.toISOString()).toBe('2026-11-16T07:00:00.000Z');
    expect(guestCancellationPolicy(booking, false, new Date('2026-11-16T07:00:00.000Z')).unpaidEligible).toBe(false);
  });

  it('blocks every payment-backed record until financial review', () => {
    expect(guestCancellationPolicy(booking, true, confirmed).unpaidEligible).toBe(false);
  });

  it.each(['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED', 'CANCELLED'] as const)(
    'blocks status %s', (status) => {
      expect(guestCancellationPolicy({ ...booking, status }, false, confirmed).unpaidEligible).toBe(false);
    },
  );

  it('rejects missing, future, historical-policy, and online confirmation anchors', () => {
    expect(guestCancellationPolicy({ ...booking, confirmedAt: null }, false, confirmed).unpaidEligible).toBe(false);
    expect(guestCancellationPolicy(booking, false, new Date(confirmed.getTime() - 1)).unpaidEligible).toBe(false);
    expect(guestCancellationPolicy({ ...booking, bookingPolicyVersion: null }, false, confirmed).unpaidEligible).toBe(false);
    expect(guestCancellationPolicy({ ...booking, paymentPreference: 'PAYMONGO' }, false, confirmed).unpaidEligible).toBe(false);
  });

  it('blocks an ended true-time stay even before the cancellation deadline', () => {
    expect(guestCancellationPolicy({
      ...booking, inventoryEndAt: confirmed,
    }, false, confirmed).unpaidEligible).toBe(false);
  });
});
