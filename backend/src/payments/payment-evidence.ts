import type { Payment, PaymentEvent } from '../generated/prisma/client.js';
import { CHECKOUT_PAID_EVENT, object } from './paymongo-webhook.payload.js';

export const paymentEvidenceSelect = {
  paymentId: true, eventType: true, status: true, signatureVerified: true,
  payloadJson: true, processedAt: true, errorMessage: true,
} as const;
export type PaymentEvidence = Pick<PaymentEvent, keyof typeof paymentEvidenceSelect>;
type EvidencePayment = Pick<Payment, 'provider' | 'providerCheckoutId' | 'providerPaymentId' | 'amountCentavos' | 'currency'> & {
  id?: string; events?: readonly PaymentEvidence[];
};

export function hasVerifiedPaymongoEvidence(payment: EvidencePayment): boolean {
  if (!payment.id || payment.provider !== 'PAYMONGO' || !payment.providerCheckoutId || !payment.providerPaymentId) return false;
  return payment.events?.some((event) => {
    if (event.paymentId !== payment.id || event.eventType !== CHECKOUT_PAID_EVENT ||
      event.status !== 'PROCESSED' || !event.signatureVerified || !event.processedAt) return false;
    let proof: unknown;
    try { proof = JSON.parse(event.payloadJson ?? 'null'); } catch { return false; }
    const data = object(proof);
    return data?.version === 1 && data.livemode === false && data.reference === payment.id &&
      data.checkoutSessionId === payment.providerCheckoutId && data.providerPaymentId === payment.providerPaymentId &&
      data.amountCentavos === payment.amountCentavos && data.currency === payment.currency;
  }) ?? false;
}

export function hasPaymentReview(payment: { events?: readonly PaymentEvidence[] }): boolean {
  return payment.events?.some((event) => event.signatureVerified &&
    (event.status === 'FAILED' || Boolean(event.errorMessage))) ?? false;
}
