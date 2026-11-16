import { describe, expect, it } from 'vitest';
import { checkoutGuidance } from './stay-operations.policy.js';

const departure = new Date('2026-11-20T07:00:00Z');
const booking = {
  status: 'CHECKED_IN' as const, rentalType: 'NIGHTLY' as const,
  scheduledArrivalAt: new Date('2026-11-19T07:00:00Z'),
  scheduledDepartureAt: departure,
  inventoryStartAt: new Date('2026-11-19T07:00:00Z'),
  inventoryEndAt: departure,
  actualArrivalAt: new Date('2026-11-19T07:00:00Z'),
  actualDepartureAt: null,
};

describe('checkout guidance boundaries', () => {
  it.each([
    ['2026-11-20T06:59:59.999Z', 'BEFORE_DEPARTURE'],
    ['2026-11-20T07:00:00.000Z', 'WITHIN_GRACE'],
    ['2026-11-20T07:30:00.000Z', 'WITHIN_GRACE'],
    ['2026-11-20T07:30:00.001Z', 'PAST_GRACE'],
  ])('classifies %s as %s', (now, phase) => {
    expect(checkoutGuidance(booking, new Date(now))).toMatchObject({
      phase, effectiveDepartureAt: departure,
      graceEndsAt: new Date('2026-11-20T07:30:00Z'),
    });
  });

  it('does not invent a precise legacy checkout clock', () => {
    expect(checkoutGuidance({ ...booking, rentalType: null })).toMatchObject({
      phase: 'TIMING_REVIEW', effectiveDepartureAt: null, graceEndsAt: null,
    });
  });

  it('requires complete timing and recognizes completed checkout', () => {
    expect(checkoutGuidance({ ...booking, inventoryStartAt: null }).phase).toBe('TIMING_REVIEW');
    expect(checkoutGuidance({ ...booking, status: 'CHECKED_OUT' }).phase).toBe('CHECKED_OUT');
  });
});
