import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { getAllowedOrigins } from '../auth/auth.config.js';

export function validCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.paymongo.com' &&
      !url.port && !url.username && !url.password && !url.hash && url.pathname !== '/';
  } catch { return false; }
}

@Injectable()
export class PaymongoAdapter {
  settings() {
    const secret = process.env.PAYMONGO_TEST_SECRET_KEY ?? '';
    const rawReturn = process.env.PAYMONGO_RETURN_URL ?? '';
    const methods = [...new Set((process.env.PAYMONGO_PAYMENT_METHODS ?? 'qrph').split(',').map((v) => v.trim()))];
    try {
      const url = new URL(rawReturn);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (!/^sk_test_[A-Za-z0-9_]+$/.test(secret) || !getAllowedOrigins().includes(url.origin) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/payment-return' ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && process.env.NODE_ENV !== 'production')) ||
        methods.length === 0 || methods.some((m) => !['card', 'gcash', 'qrph'].includes(m))) throw new Error();
      return { secret, returnUrl: url.toString(), methods };
    } catch {
      throw new ServiceUnavailableException('PayMongo test checkout is not configured.');
    }
  }

  async create(input: { paymentId: string; reference: string; amountCentavos: number },
    settings: ReturnType<PaymongoAdapter['settings']>) {
    const success = new URL(settings.returnUrl);
    success.searchParams.set('outcome', 'returned');
    const cancel = new URL(settings.returnUrl);
    cancel.searchParams.set('outcome', 'cancelled');
    const response = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Basic ${Buffer.from(`${settings.secret}:`).toString('base64')}`,
        'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { attributes: {
        line_items: [{ name: `NEXORA reservation ${input.reference}`, amount: input.amountCentavos, quantity: 1, currency: 'PHP' }],
        payment_method_types: settings.methods,
        reference_number: input.paymentId,
        success_url: success.toString(), cancel_url: cancel.toString(),
        send_email_receipt: false, pass_on_fees: false,
      } } }),
    });
    if (!response.ok) throw new Error('Checkout creation outcome requires review.');
    const payload = await response.json() as { data?: { id?: unknown; type?: unknown;
      attributes?: { checkout_url?: unknown; livemode?: unknown } } };
    const data = payload?.data;
    if (data?.type !== 'checkout_session' || typeof data.id !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(data.id) ||
      data.attributes?.livemode !== false || !validCheckoutUrl(data.attributes.checkout_url)) {
      throw new Error('Checkout creation outcome requires review.');
    }
    return { id: data.id, url: data.attributes.checkout_url };
  }
}
