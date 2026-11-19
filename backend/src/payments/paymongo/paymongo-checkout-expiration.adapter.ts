import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  object,
} from './paymongo-webhook.payload.js';

export interface CheckoutExpirationInput {
  paymentId: string;
  checkoutSessionId: string;
}

type SessionState =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVIEW_REQUIRED';

@Injectable()
export class PaymongoCheckoutExpirationAdapter {
  private secret(): string {
    const secret =
      process.env.PAYMONGO_TEST_SECRET_KEY ?? '';

    if (
      !/^sk_test_[A-Za-z0-9_]+$/.test(secret)
    ) {
      throw new ServiceUnavailableException(
        'PayMongo test expiration is not configured.',
      );
    }

    return secret;
  }

  private async request(
    path: string,
    method: 'GET' | 'POST',
    secret: string,
  ): Promise<unknown> {
    try {
      const response = await fetch(
        'https://api.paymongo.com/v1/' + path,
        {
          method,
          redirect: 'error',
          signal: AbortSignal.timeout(10_000),
          headers: {
            Authorization:
              `Basic ${Buffer.from(
                `${secret}:`,
              ).toString('base64')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          'Synthetic-safe provider request failure.',
        );
      }

      if (method === 'POST') {
        return null;
      }

      return await response.json();
    } catch {
      throw new ServiceUnavailableException(
        'Checkout expiration could not be confirmed. Retry the existing session.',
      );
    }
  }

  private state(
    payload: unknown,
    input: CheckoutExpirationInput,
  ): SessionState {
    const data = object(
      object(payload)?.data,
    );

    const attributes = object(
      data?.attributes,
    );

    if (
      data?.type !== 'checkout_session' ||
      data.id !== input.checkoutSessionId ||
      attributes?.livemode !== false ||
      attributes.reference_number !==
        input.paymentId ||
      !Array.isArray(attributes.payments) ||
      attributes.payments.length !== 0
    ) {
      return 'REVIEW_REQUIRED';
    }

    const intent = object(
      attributes.payment_intent,
    );

    if (
      attributes.payment_intent !== undefined &&
      attributes.payment_intent !== null
    ) {
      const intentAttributes = object(
        intent?.attributes,
      );

      const allowedIntentStates =
        attributes.status === 'expired'
          ? [
              'awaiting_payment_method',
              'cancelled',
            ]
          : ['awaiting_payment_method'];

      if (
        !intentAttributes ||
        !allowedIntentStates.includes(
          String(intentAttributes.status),
        )
      ) {
        return 'REVIEW_REQUIRED';
      }
    }

    if (attributes.status === 'expired') {
      return 'EXPIRED';
    }

    if (attributes.status === 'active') {
      return 'ACTIVE';
    }

    return 'REVIEW_REQUIRED';
  }

  async close(
    input: CheckoutExpirationInput,
  ): Promise<'EXPIRED' | 'REVIEW_REQUIRED'> {
    if (
      !/^cs_[A-Za-z0-9_]{1,96}$/.test(
        input.checkoutSessionId,
      ) ||
      !input.paymentId ||
      input.paymentId.length > 100
    ) {
      throw new ServiceUnavailableException(
        'A stored checkout reference is required.',
      );
    }

    const secret = this.secret();

    const path =
      'checkout_sessions/' +
      encodeURIComponent(
        input.checkoutSessionId,
      );

    const before = this.state(
      await this.request(
        path,
        'GET',
        secret,
      ),
      input,
    );

    if (before !== 'ACTIVE') {
      return before;
    }

    try {
      await this.request(
        path + '/expire',
        'POST',
        secret,
      );
    } catch {
      // The provider may have applied expiration
      // before its response was lost.
    }

    const after = this.state(
      await this.request(
        path,
        'GET',
        secret,
      ),
      input,
    );

    if (after === 'ACTIVE') {
      throw new ServiceUnavailableException(
        'The existing checkout still needs expiration.',
      );
    }

    return after;
  }
}