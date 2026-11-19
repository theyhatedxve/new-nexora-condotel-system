import {
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PaymongoCheckoutExpirationAdapter,
} from './paymongo-checkout-expiration.adapter.js';

describe('PayMongo test checkout expiration', () => {
  const fetchMock = vi.fn<typeof fetch>();

  const input = {
    paymentId: 'synthetic-local-payment',
    checkoutSessionId: 'cs_synthetic_expiration',
  };

  let adapter: PaymongoCheckoutExpirationAdapter;

  function resource(
    status = 'expired',
    reference = input.paymentId,
    livemode = false,
  ) {
    return {
      data: {
        id: input.checkoutSessionId,
        type: 'checkout_session',
        attributes: {
          reference_number: reference,
          livemode,
          status,
          payments: [],
        },
      },
    };
  }

  function response(body: unknown, status = 200) {
    return new Response(
      JSON.stringify(body),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  beforeEach(() => {
    fetchMock.mockReset();

    vi.stubGlobal('fetch', fetchMock);

    vi.stubEnv(
      'PAYMONGO_TEST_SECRET_KEY',
      'sk_test_synthetic_expiration',
    );

    adapter =
      new PaymongoCheckoutExpirationAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('accepts an already expired matching test session', async () => {
    fetchMock.mockResolvedValueOnce(
      response(resource()),
    );

    await expect(
      adapter.close(input),
    ).resolves.toBe('EXPIRED');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('expires an active session and verifies its final state', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response(resource('active')),
      )
      .mockResolvedValueOnce(
        response({}),
      )
      .mockResolvedValueOnce(
        response(resource('expired')),
      );

    await expect(
      adapter.close(input),
    ).resolves.toBe('EXPIRED');

    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.paymongo.com/v1/checkout_sessions/cs_synthetic_expiration/expire',
    );

    expect(
      fetchMock.mock.calls[1][1]?.method,
    ).toBe('POST');
  });

  it('recovers an uncertain expiration response by reading the session', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response(resource('active')),
      )
      .mockRejectedValueOnce(
        new Error('synthetic timeout'),
      )
      .mockResolvedValueOnce(
        response(resource('expired')),
      );

    await expect(
      adapter.close(input),
    ).resolves.toBe('EXPIRED');
  });

  it('retains a still-active session for retry', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response(resource('active')),
      )
      .mockResolvedValueOnce(
        response({}),
      )
      .mockResolvedValueOnce(
        response(resource('active')),
      );

    await expect(
      adapter.close(input),
    ).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not expire a session with another local reference', async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        resource('active', 'different-payment'),
      ),
    );

    await expect(
      adapter.close(input),
    ).resolves.toBe('REVIEW_REQUIRED');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not expire a live-mode resource', async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        resource(
          'active',
          input.paymentId,
          true,
        ),
      ),
    );

    await expect(
      adapter.close(input),
    ).resolves.toBe('REVIEW_REQUIRED');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not treat a provider payment as permission to expire', async () => {
    const body = resource('active');

    const paidBody = {
      data: {
        ...body.data,
        attributes: {
          ...body.data.attributes,
          payments: [
            {
              id: 'pay_synthetic',
              type: 'payment',
              attributes: {
                status: 'paid',
              },
            },
          ],
        },
      },
    };

    fetchMock.mockResolvedValueOnce(
      response(paidBody),
    );

    await expect(
      adapter.close(input),
    ).resolves.toBe('REVIEW_REQUIRED');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retains an in-progress payment intent for review', async () => {
    const body = resource('active');

    fetchMock.mockResolvedValueOnce(
      response({
        data: {
          ...body.data,
          attributes: {
            ...body.data.attributes,
            payment_intent: {
              attributes: {
                status: 'processing',
              },
            },
          },
        },
      }),
    );

    await expect(
      adapter.close(input),
    ).resolves.toBe('REVIEW_REQUIRED');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects live credentials before making a request', async () => {
    vi.stubEnv(
      'PAYMONGO_TEST_SECRET_KEY',
      'sk_live_synthetic_not_real',
    );

    await expect(
      adapter.close(input),
    ).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});