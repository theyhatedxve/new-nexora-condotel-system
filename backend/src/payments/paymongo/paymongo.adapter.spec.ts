import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymongoAdapter } from './paymongo.adapter.js';

const payload = { data: { id: 'cs_test_session', type: 'checkout_session',
  attributes: { livemode: false, checkout_url: 'https://checkout.paymongo.com/test-session' } } };
const input = { paymentId: 'test-payment', reference: 'NX-test', amountCentavos: 500_000 };
let adapter: PaymongoAdapter;
let fakeFetch: ReturnType<typeof vi.fn>;
describe('Step 7.2 — PayMongo test-mode adapter', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', 'http://localhost:5173');
    vi.stubEnv('PAYMONGO_TEST_SECRET_KEY', 'sk_test_fixture_only');
    vi.stubEnv('PAYMONGO_RETURN_URL', 'http://localhost:5173/payment-return');
    vi.stubEnv('PAYMONGO_PAYMENT_METHODS', 'qrph');
    fakeFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal('fetch', fakeFetch);
    adapter = new PaymongoAdapter();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('uses the fixed v2 endpoint and backend amounts without passing fees to the guest', async () => {
    const result = await adapter.create(input, adapter.settings());
    expect(result).toEqual({ id: payload.data.id, url: payload.data.attributes.checkout_url });
    const [url, request] = fakeFetch.mock.calls[0];
    expect(url).toBe('https://api.paymongo.com/v2/checkout_sessions');
    expect(request.redirect).toBe('error');
    const body = JSON.parse(request.body);
    expect(body.data.attributes.line_items).toEqual([
      { name: 'NEXORA reservation NX-test', amount: 500_000, currency: 'PHP', quantity: 1 },
    ]);
    expect(body.data.attributes.reference_number).toBe('test-payment');
    expect(body.data.attributes.pass_on_fees).toBe(false);
    expect(body.data.attributes.send_email_receipt).toBe(false);
    expect(body.data.attributes).not.toHaveProperty('billing');
  });
  for (const [name, value] of [
    ['PAYMONGO_TEST_SECRET_KEY', 'sk_live_not_allowed'],
    ['PAYMONGO_RETURN_URL', 'https://evil.example/payment-return'],
    ['PAYMONGO_PAYMENT_METHODS', 'unknown'],
  ]) {
    it(`rejects invalid configuration in ${name} before any provider call`, () => {
      vi.stubEnv(name, value);
      expect(() => adapter.settings()).toThrow('not configured');
      expect(fakeFetch).not.toHaveBeenCalled();
    });
  }
  for (const change of [
    { livemode: true }, { checkout_url: 'https://evil.example/pay' },
    { checkout_url: 'https://checkout.paymongo.com.evil.example/pay' },
    { checkout_url: 'https://user:pass@checkout.paymongo.com/pay' },
  ]) {
    it(`rejects an unsafe provider response ${JSON.stringify(change)}`, async () => {
      fakeFetch.mockResolvedValue(new Response(JSON.stringify({ data: { ...payload.data,
        attributes: { ...payload.data.attributes, ...change } } })));
      await expect(adapter.create(input, adapter.settings())).rejects.toThrow('requires review');
    });
  }
  it('does not retry timeouts or network failures automatically', async () => {
    fakeFetch.mockRejectedValue(new Error('synthetic network failure'));
    await expect(adapter.create(input, adapter.settings())).rejects.toThrow();
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
  it('does not accept a non-success HTTP response', async () => {
    fakeFetch.mockResolvedValue(new Response('{}', { status: 502 }));
    await expect(adapter.create(input, adapter.settings())).rejects.toThrow('requires review');
  });
});
