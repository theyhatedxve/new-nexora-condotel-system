import { describe, expect, it } from 'vitest';
import { lateCheckoutCharge } from './late-checkout-charge.policy.js';

const base = new Date('2026-11-20T07:00:00Z');
const after = (minutes: number) => new Date(base.getTime() + minutes * 60_000);
describe('approved late-checkout billing rule', () => {
  it.each([[30, 0], [31, 1], [70, 1], [90, 1], [91, 2]])(
    '%s minutes after departure costs %s hourly units', (minutes, hours) => {
      expect(lateCheckoutCharge(base, after(minutes), 10000)).toEqual({
        billableHours: hours, amountCentavos: hours * 10000,
      });
    },
  );
  it('does not restart grace or bill already purchased hours twice', () => {
    expect(lateCheckoutCharge(base, after(80), 10000, 1).amountCentavos).toBe(0);
    expect(lateCheckoutCharge(base, after(100), 10000, 1).amountCentavos).toBe(10000);
  });
  it('rejects invalid money and overflow', () => {
    expect(() => lateCheckoutCharge(base, after(70), -1)).toThrow();
    expect(() => lateCheckoutCharge(base, after(200), 2147483647)).toThrow();
  });
});
