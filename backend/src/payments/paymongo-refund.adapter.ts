// CREATE: backend/src/payments/paymongo-refund.adapter.ts

import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  REFUND_REASONS,
  type RefundReason,
} from './dto/create-refund.dto.js';
import { object } from './paymongo-webhook.payload.js';

export type RefundRequest = {
  refundId: string;
  paymentId: string;
  amountCentavos: number;
  reason: RefundReason;
};

export type ProviderRefund = {
  id: string;
  paymentId: string;
  localRefundId: string;
  amountCentavos: number;
  currency: 'PHP';
  livemode: false;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
};

@Injectable()
export class PaymongoRefundAdapter {
  secret() {
    const value = process.env.PAYMONGO_TEST_SECRET_KEY ?? '';

    if (!/^sk_test_[A-Za-z0-9_]+$/.test(value)) {
      throw new ServiceUnavailableException(
        'PayMongo test refunds are not configured.',
      );
    }

    return value;
  }

  async create(
    input: RefundRequest,
    secret: string,
  ): Promise<ProviderRefund> {
    if (
      !/^sk_test_[A-Za-z0-9_]+$/.test(secret) ||
      !/^rfd_[a-f0-9]{64}$/.test(input.refundId) ||
      !/^pay_[A-Za-z0-9_]{1,96}$/.test(input.paymentId) ||
      !Number.isSafeInteger(input.amountCentavos) ||
      input.amountCentavos < 100 ||
      input.amountCentavos > 2_147_483_647 ||
      !REFUND_REASONS.includes(input.reason)
    ) {
      throw new Error('Invalid test refund request.');
    }

    const response = await fetch(
      'https://api.paymongo.com/v1/refunds',
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization:
            `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.refundId,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: input.amountCentavos,
              payment_id: input.paymentId,
              reason: input.reason,
              metadata: {
                nexora_refund_id: input.refundId,
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Refund outcome requires review.');
    }

    const data = object(object(await response.json())?.data);
    const attributes = object(data?.attributes);
    const metadata = object(attributes?.metadata);

    if (
      data?.type !== 'refund' ||
      typeof data.id !== 'string' ||
      !/^ref_[A-Za-z0-9_]{1,96}$/.test(data.id) ||
      attributes?.livemode !== false ||
      attributes.payment_id !== input.paymentId ||
      attributes.amount !== input.amountCentavos ||
      attributes.currency !== 'PHP' ||
      attributes.reason !== input.reason ||
      metadata?.nexora_refund_id !== input.refundId ||
      !['pending', 'processing', 'succeeded', 'failed'].includes(
        String(attributes.status),
      )
    ) {
      throw new Error('Refund outcome requires review.');
    }

    return {
      id: data.id,
      paymentId: input.paymentId,
      localRefundId: input.refundId,
      amountCentavos: input.amountCentavos,
      currency: 'PHP',
      livemode: false,
      status:
        attributes.status === 'succeeded'
          ? 'COMPLETED'
          : attributes.status === 'failed'
            ? 'FAILED'
            : 'PENDING',
    };
  }
}