import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

export const CHECKOUT_PAID_EVENT = 'checkout_session.payment.paid';
type ObjectValue = Record<string, unknown>;
export function object(value: unknown): ObjectValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ObjectValue : null;
}
function id(value: unknown, prefix: string): value is string {
  return typeof value === 'string' && value.length <= 100 && new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(value);
}
export type PaidCheckout = {
  reference: string; checkoutSessionId: string; providerPaymentId: string;
  amountCentavos: number; currency: string;
};
function checkout(value: unknown): PaidCheckout | null {
  const session = object(value);
  const attributes = object(session?.attributes);
  if (!session || session.type !== 'checkout_session' || !id(session.id, 'cs') || !attributes ||
    (attributes.livemode !== undefined && attributes.livemode !== false) ||
    typeof attributes.reference_number !== 'string' || !attributes.reference_number || attributes.reference_number.length > 100 ||
    !Array.isArray(attributes.payments)) return null;
  const paid = attributes.payments.map(object).filter((row) => object(row?.attributes)?.status === 'paid');
  if (paid.length !== 1) return null;
  const payment = paid[0];
  const money = object(payment?.attributes);
  if (!payment || payment.type !== 'payment' || !id(payment.id, 'pay') || !money ||
    (money.livemode !== undefined && money.livemode !== false) ||
    typeof money.amount !== 'number' || !Number.isSafeInteger(money.amount) || money.amount <= 0 ||
    typeof money.currency !== 'string' || !/^[A-Z]{3}$/.test(money.currency)) return null;
  return { reference: attributes.reference_number, checkoutSessionId: session.id,
    providerPaymentId: payment.id, amountCentavos: money.amount, currency: money.currency };
}

export function parseWebhook(body: unknown) {
  const event = object(object(body)?.data);
  const attributes = object(event?.attributes);
  if (!event || event.type !== 'event' || !id(event.id, 'evt') || !attributes ||
    attributes.livemode !== false || typeof attributes.type !== 'string' || !attributes.type || attributes.type.length > 100 ||
    typeof attributes.created_at !== 'number' || !Number.isSafeInteger(attributes.created_at) || attributes.created_at < 0 ||
    !Number.isFinite(new Date(attributes.created_at * 1000).getTime())) {
    throw new BadRequestException('A valid test-mode event envelope is required.');
  }
  const paid = attributes.type === CHECKOUT_PAID_EVENT ? checkout(attributes.data) : null;
  const normalized = { eventId: event.id, eventType: attributes.type, createdAt: attributes.created_at,
    livemode: false, paid };
  const fingerprint = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  return { id: event.id, type: attributes.type, createdAt: new Date(attributes.created_at * 1000), paid, fingerprint };
}
