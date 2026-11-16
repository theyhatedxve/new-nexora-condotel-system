import type { Payment } from '../generated/prisma/client.js';
import { hasPaymentReview, type PaymentEvidence } from './payment-evidence.js';

export const CLOSED_UNPAID_EVENT = 'nexora.checkout.closed_unpaid';

type Attempt = Pick<Payment,
  'id' | 'method' | 'provider' | 'status' | 'currency' | 'amountCentavos' |
  'paidAt' | 'providerCheckoutId' | 'providerPaymentId' | 'checkoutState'
> & { refunds: readonly unknown[]; events: readonly PaymentEvidence[] };

export function isRetiredAttempt(payment: Attempt, total: number): boolean {
  if (!Number.isSafeInteger(total) || total <= 0 || payment.status !== 'FAILED' || payment.method !== 'PAYMONGO' ||
      payment.provider !== 'PAYMONGO' || payment.currency !== 'PHP' ||
      payment.amountCentavos !== total || !payment.providerCheckoutId ||
      payment.paidAt || payment.providerPaymentId || payment.refunds.length ||
      hasPaymentReview(payment) || payment.events.some((event) => event.signatureVerified)) return false;
  return hasClosedUnpaidEvidence(payment, total);
}

export function hasClosedUnpaidEvidence(payment: Attempt, total: number): boolean {
  if (!Number.isSafeInteger(total) || total <= 0 ||
      payment.method !== 'PAYMONGO' || payment.provider !== 'PAYMONGO' ||
      payment.currency !== 'PHP' || payment.amountCentavos !== total ||
      !payment.providerCheckoutId) return false;
  return payment.events.some((event) => {
    if (event.paymentId !== payment.id || event.eventType !== CLOSED_UNPAID_EVENT ||
        event.signatureVerified || event.status !== 'PROCESSED' ||
        !event.processedAt || event.errorMessage) return false;
    try {
      const proof = JSON.parse(event.payloadJson ?? 'null');
      return proof?.version === 1 && proof.source === 'backend_checkout_retry' &&
        proof.checkoutSessionId === payment.providerCheckoutId &&
        proof.amountCentavos === payment.amountCentavos && proof.currency === payment.currency;
    } catch { return false; }
  });
}

export function activeOnlineAttempts<T extends Attempt>(
  booking: { payments: readonly T[]; totalAmountCentavos: number },
): T[] {
  return booking.payments.filter((payment) => !isRetiredAttempt(payment, booking.totalAmountCentavos));
}

export function canReplaceAttempt(payment: Attempt, total: number): boolean {
  return Number.isSafeInteger(total) && total > 0 &&
    payment.status === 'PENDING' && payment.method === 'PAYMONGO' &&
    payment.provider === 'PAYMONGO' && payment.currency === 'PHP' &&
    payment.amountCentavos === total && Boolean(payment.providerCheckoutId) &&
    ['READY', 'UNKNOWN'].includes(payment.checkoutState ?? '') &&
    !payment.paidAt && !payment.providerPaymentId && payment.refunds.length === 0 &&
    !hasPaymentReview(payment) && !payment.events.some((event) => event.signatureVerified);
}
