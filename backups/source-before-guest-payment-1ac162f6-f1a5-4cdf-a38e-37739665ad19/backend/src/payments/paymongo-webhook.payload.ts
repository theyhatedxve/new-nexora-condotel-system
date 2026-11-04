import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { REFUND_REASONS } from './dto/create-refund.dto.js';

export const CHECKOUT_PAID_EVENT = 'checkout_session.payment.paid';
export const REFUND_EVENTS = ['payment.refunded', 'payment.refund.updated'];
export const PAYMENT_FAILED_EVENT = 'payment.failed';

export type RefundFact = {
  id: string;
  paymentId: string;
  localRefundId: string | null;
  amountCentavos: number;
  currency: 'PHP';
  livemode: false;
  reason: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
};

type ObjectValue = Record<string, unknown>;

export function object(value: unknown): ObjectValue | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ObjectValue)
    : null;
}

function id(value: unknown, prefix: string): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 100 &&
    new RegExp(`^${prefix}_[A-Za-z0-9_]+$`).test(value)
  );
}

export type PaidCheckout = {
  reference: string;
  checkoutSessionId: string;
  providerPaymentId: string;
  amountCentavos: number;
  currency: string;
};

function checkout(value: unknown): PaidCheckout | null {
  const session = object(value);
  const attributes = object(session?.attributes);
  if (
    !session ||
    session.type !== 'checkout_session' ||
    !id(session.id, 'cs') ||
    !attributes ||
    (attributes.livemode !== undefined && attributes.livemode !== false) ||
    typeof attributes.reference_number !== 'string' ||
    !attributes.reference_number ||
    attributes.reference_number.length > 100 ||
    !Array.isArray(attributes.payments)
  )
    return null;

  const paid = attributes.payments
    .map(object)
    .filter((row) => object(row?.attributes)?.status === 'paid');

  if (paid.length !== 1) return null;

  const payment = paid[0];
  const money = object(payment?.attributes);
  if (
    !payment ||
    payment.type !== 'payment' ||
    !id(payment.id, 'pay') ||
    !money ||
    (money.livemode !== undefined && money.livemode !== false) ||
    typeof money.amount !== 'number' ||
    !Number.isSafeInteger(money.amount) ||
    money.amount <= 0 ||
    typeof money.currency !== 'string' ||
    !/^[A-Z]{3}$/.test(money.currency)
  )
    return null;

  return {
    reference: attributes.reference_number,
    checkoutSessionId: session.id,
    providerPaymentId: payment.id,
    amountCentavos: money.amount,
    currency: money.currency,
  };
}

function refundFacts(value: unknown): RefundFact[] | null {
  const resource = object(value);
  const attributes = object(resource?.attributes);
  const rows =
    resource?.type === 'refund'
      ? [resource]
      : resource?.type === 'payment' &&
          id(resource.id, 'pay') &&
          attributes?.currency === 'PHP' &&
          Number.isSafeInteger(attributes.amount) &&
          Number(attributes.amount) > 0 &&
          (attributes.livemode === undefined ||
            attributes.livemode === false) &&
          Array.isArray(attributes.refunds)
        ? attributes.refunds
        : null;

  if (!rows || rows.length === 0 || rows.length > 100) return null;

  const facts: RefundFact[] = [];

  for (const row of rows) {
    const refund = object(row),
      money = object(refund?.attributes);
    const metadata = object(money?.metadata);
    const localId = metadata?.nexora_refund_id;

    if (
      refund?.type !== 'refund' ||
      !id(refund.id, 'ref') ||
      !money ||
      !id(money.payment_id, 'pay') ||
      money.livemode !== false ||
      money.currency !== 'PHP' ||
      typeof money.amount !== 'number' ||
      !Number.isSafeInteger(money.amount) ||
      money.amount < 100 ||
      money.amount > 2_147_483_647 ||
      !REFUND_REASONS.some((reason) => reason === money.reason) ||
      !['pending', 'processing', 'succeeded', 'failed'].includes(
        String(money.status),
      ) ||
      (resource?.type === 'payment' && money.payment_id !== resource.id) ||
      (localId !== undefined &&
        (typeof localId !== 'string' || !/^rfd_[a-f0-9]{64}$/.test(localId)))
    )
      return null;

    facts.push({
      id: refund.id,
      paymentId: money.payment_id,
      localRefundId: (localId as string | undefined) ?? null,
      amountCentavos: money.amount,
      currency: 'PHP',
      livemode: false,
      reason: String(money.reason),
      status:
        money.status === 'succeeded'
          ? 'COMPLETED'
          : money.status === 'failed'
            ? 'FAILED'
            : 'PENDING',
    });
  }

  if (new Set(facts.map((row) => row.id)).size !== facts.length) return null;

  return facts;
}

export function parseWebhook(body: unknown) {
  const event = object(object(body)?.data);
  const attributes = object(event?.attributes);

  if (
    !event ||
    event.type !== 'event' ||
    !id(event.id, 'evt') ||
    !attributes ||
    attributes.livemode !== false ||
    typeof attributes.type !== 'string' ||
    !attributes.type ||
    attributes.type.length > 100 ||
    typeof attributes.created_at !== 'number' ||
    !Number.isSafeInteger(attributes.created_at) ||
    attributes.created_at < 0 ||
    !Number.isFinite(new Date(attributes.created_at * 1000).getTime())
  ) {
    throw new BadRequestException(
      'A valid test-mode event envelope is required.',
    );
  }

  const paid =
    attributes.type === CHECKOUT_PAID_EVENT ? checkout(attributes.data) : null;

  const resource = object(attributes.data),
    money = object(resource?.attributes);

  const relatedPaymentId =
    resource?.type === 'payment' && id(resource.id, 'pay')
      ? resource.id
      : resource?.type === 'refund' && id(money?.payment_id, 'pay')
        ? money.payment_id
        : null;

  const refunds = REFUND_EVENTS.includes(attributes.type)
    ? refundFacts(attributes.data)
    : null;

  const failed =
    attributes.type === PAYMENT_FAILED_EVENT &&
    resource?.type === 'payment' &&
    relatedPaymentId &&
    money?.status === 'failed' &&
    (money.livemode === undefined || money.livemode === false) &&
    Number.isSafeInteger(money.amount) &&
    Number(money.amount) > 0 &&
    typeof money.currency === 'string'
      ? {
          providerPaymentId: relatedPaymentId,
          amountCentavos: Number(money.amount),
          currency: money.currency,
        }
      : null;

  const normalized = {
    eventId: event.id,
    eventType: attributes.type,
    createdAt: attributes.created_at,
    livemode: false,
    paid,
  };

  const facts = REFUND_EVENTS.includes(attributes.type)
    ? { refunds, relatedPaymentId }
    : attributes.type === PAYMENT_FAILED_EVENT
      ? { failed, relatedPaymentId }
      : {};

  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ ...normalized, ...facts }))
    .digest('hex');

  const legacyFingerprint = createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');

  return {
    id: event.id,
    type: attributes.type,
    createdAt: new Date(attributes.created_at * 1000),
    paid,
    refunds,
    failed,
    relatedPaymentId,
    fingerprint,
    legacyFingerprint,
  };
}