import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { object } from './paymongo-webhook.payload.js';
import {
  PaymongoRefundAdapter,
  normalizeRefund,
  type RefundRequest,
} from './paymongo-refund.adapter.js';

@Injectable()
export class PaymongoReconciliationAdapter {
  constructor(private readonly refunds: PaymongoRefundAdapter) {}

  private async read(path: string): Promise<unknown> {
    const secret = this.refunds.secret();
    try {
      const response = await fetch('https://api.paymongo.com/v1/' + path, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
        },
      });
      if (!response.ok) throw new Error('Provider check failed.');
      return object(await response.json())?.data;
    } catch {
      throw new ServiceUnavailableException(
        'Provider check could not be confirmed. Local records were preserved.',
      );
    }
  }

  async payment(id: string) {
    if (!/^pay_[A-Za-z0-9_]{1,96}$/.test(id)) return null;
    const data = object(await this.read('payments/' + encodeURIComponent(id)));
    const money = object(data?.attributes);
    if (
      data?.type !== 'payment' ||
      data.id !== id ||
      money?.livemode !== false ||
      money.status !== 'paid' ||
      money.currency !== 'PHP' ||
      typeof money.amount !== 'number' ||
      !Number.isSafeInteger(money.amount) ||
      money.amount <= 0 ||
      money.amount > 2147483647 ||
      !Array.isArray(money.refunds)
    )
      return null;
    return {
      id,
      amountCentavos: money.amount,
      currency: 'PHP' as const,
      status: 'paid' as const,
      refunds: money.refunds.length,
    };
  }

  async refund(id: string, input: RefundRequest) {
    if (!/^ref_[A-Za-z0-9_]{1,96}$/.test(id)) {
      throw new ServiceUnavailableException(
        'A valid existing provider refund reference is required.',
      );
    }
    const resource = await this.read('refunds/' + encodeURIComponent(id));
    try {
      const result = normalizeRefund(resource, input);
      if (result.id !== id) throw new Error('Refund reference mismatch.');
      return result;
    } catch {
      throw new ServiceUnavailableException(
        'Provider refund evidence could not be matched. Local records were preserved.',
      );
    }
  }
}