import { ConflictException } from '@nestjs/common';

import type { Payment } from '../generated/prisma/client.js';

import { validCheckoutUrl } from './paymongo.adapter.js';
import { hasVerifiedPaymongoEvidence, type PaymentEvidence } from './payment-evidence.js';

export function checkoutResponse(payment: Payment & { events?: PaymentEvidence[] }) {
  if (payment.status === 'PAID' && hasVerifiedPaymongoEvidence(payment)) {
    return { state: 'PAID' as const, amountCentavos: payment.amountCentavos, checkoutUrl: null };
  }

  if (payment.status !== 'PENDING') {
    throw new ConflictException('Reload the booking payment summary.');
  }

  if (payment.checkoutState === 'READY' && validCheckoutUrl(payment.checkoutUrl)) {
    return { state: 'READY' as const, amountCentavos: payment.amountCentavos, checkoutUrl: payment.checkoutUrl };
  }

  return {
    state: payment.checkoutState === 'CREATING' ? 'CREATING' as const : 'UNKNOWN' as const,
    amountCentavos: payment.amountCentavos,
    checkoutUrl: null,
  };
}
