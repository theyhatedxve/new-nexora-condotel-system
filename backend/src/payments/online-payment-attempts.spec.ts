import { describe, expect, it } from 'vitest';
import { isRetiredAttempt, canReplaceAttempt, CLOSED_UNPAID_EVENT } from './online-payment-attempts.js';

function retired() {
  return {
    id: 'payment', method: 'PAYMONGO' as const, provider: 'PAYMONGO',
    status: 'FAILED' as const, currency: 'PHP', amountCentavos: 100000,
    paidAt: null, providerPaymentId: null, providerCheckoutId: 'cs_closed',
    checkoutState: 'READY' as const, refunds: [],
    events: [{
      paymentId: 'payment', eventType: CLOSED_UNPAID_EVENT,
      status: 'PROCESSED' as const, signatureVerified: false,
      processedAt: new Date(), errorMessage: null,
      payloadJson: JSON.stringify({
        version: 1, source: 'backend_checkout_retry',
        checkoutSessionId: 'cs_closed', amountCentavos: 100000, currency: 'PHP',
      }),
    }],
  };
}

describe('retired checkout evidence', () => {
  it('requires matching internal closure proof, rather than FAILED status alone', () => {
    const payment = retired();
    expect(isRetiredAttempt(payment, 100000)).toBe(true);
    expect(isRetiredAttempt({ ...payment, events: [] }, 100000)).toBe(false);
    expect(isRetiredAttempt({ ...payment, providerCheckoutId: 'another-session' }, 100000)).toBe(false);
    expect(isRetiredAttempt({ ...payment, events: [{ ...payment.events[0], signatureVerified: true }] }, 100000)).toBe(false);
  });
  it('blocks replacement when financial evidence or session identity is uncertain', () => {
    const pending = { ...retired(), status: 'PENDING' as const, events: [] };
    expect(canReplaceAttempt(pending, 100000)).toBe(true);
    expect(canReplaceAttempt({ ...pending, providerCheckoutId: null }, 100000)).toBe(false);
    expect(canReplaceAttempt({ ...pending, paidAt: new Date() }, 100000)).toBe(false);
    expect(canReplaceAttempt({ ...pending, checkoutState: 'CREATING' }, 100000)).toBe(false);
  });
});
