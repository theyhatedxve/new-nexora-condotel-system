import {
  afterEach,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PaymongoAdapter,
} from './paymongo.adapter.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('binds both provider return URLs to the booking reference', async () => {
  const fetchMock = vi.fn<typeof fetch>();

  vi.stubGlobal('fetch', fetchMock);

  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        data: {
          id: 'cs_synthetic_return',
          type: 'checkout_session',
          attributes: {
            livemode: false,
            checkout_url:
              'https://checkout.paymongo.com/synthetic-return',
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ),
  );

  const adapter = new PaymongoAdapter();

  await adapter.create(
    {
      paymentId: 'synthetic-payment',
      reference: 'NX-synthetic-return',
      amountCentavos: 100000,
    },
    {
      secret: 'sk_test_synthetic_only',
      returnUrl:
        'http://localhost:5175/payment-return',
      methods: ['qrph'],
    },
  );

    const requestBody =
    fetchMock.mock.calls[0][1]?.body;

  if (typeof requestBody !== 'string') {
    throw new Error(
      'Expected a JSON request body string.',
    );
  }

  const body = JSON.parse(requestBody) as {
    data: {
      attributes: {
        success_url: string;
        cancel_url: string;
      };
    };
  };

  const success = new URL(
    body.data.attributes.success_url,
  );

  const cancel = new URL(
    body.data.attributes.cancel_url,
  );

  expect(
    success.searchParams.get('booking'),
  ).toBe('NX-synthetic-return');

  expect(
    cancel.searchParams.get('booking'),
  ).toBe('NX-synthetic-return');

  expect(
    success.searchParams.get('outcome'),
  ).toBe('returned');

  expect(
    cancel.searchParams.get('outcome'),
  ).toBe('cancelled');
});