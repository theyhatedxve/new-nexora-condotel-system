import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

// Signature timestamp age is a delivery-safety signal, not booking expiry.
export function verifyPaymongoWebhook(raw: unknown, header: unknown, now = Date.now()) {
  const secret = process.env.PAYMONGO_TEST_WEBHOOK_SECRET ?? '';
  if (!secret || secret !== secret.trim() || secret.length > 512) {
    throw new ServiceUnavailableException('Test webhook verification is not configured.');
  }
  if (!Buffer.isBuffer(raw) || raw.length === 0 || raw.length > 256_000) {
    throw new BadRequestException('A bounded raw JSON body is required.');
  }
  const denied = () => new UnauthorizedException('Webhook signature is invalid.');
  if (typeof header !== 'string' || header.length > 512) throw denied();
  const parts = new Map<string, string>();
  for (const part of header.split(',')) {
    const match = /^\s*(t|te|li)=([^,]*)\s*$/.exec(part);
    if (!match || parts.has(match[1])) throw denied();
    parts.set(match[1], match[2].trim());
  }
  const timestamp = parts.get('t') ?? '';
  const signature = parts.get('te') ?? '';
  if (!/^\d{1,12}$/.test(timestamp) || !/^[a-fA-F0-9]{64}$/.test(signature) || parts.get('li')) throw denied();
  const expected = createHmac('sha256', secret).update(timestamp).update('.').update(raw).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw denied();
  let body: unknown;
  try { body = JSON.parse(raw.toString('utf8')); } catch { throw new BadRequestException('Webhook JSON is invalid.'); }
  return { body, stale: Math.abs(now - Number(timestamp) * 1000) > 300_000 };
}
