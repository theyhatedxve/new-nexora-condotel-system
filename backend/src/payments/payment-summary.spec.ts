import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  calculatePaymentSummary,
  type SummaryPayment,
} from './payment-summary.js';

const now =
  new Date('2026-11-01T04:00:00Z');

function receipt(
  change: Partial<SummaryPayment> = {},
): SummaryPayment {
  return {
    method: 'PAY_AT_PROPERTY',
    status: 'PAID',
    amountCentavos: 750_000,
    currency: 'PHP',
    paidAt:
      new Date('2026-11-01T03:00:00Z'),
    provider: null,
    providerCheckoutId: null,
    providerPaymentId: null,
    refunds: [],
    ...change,
  };
}

function summarize(
  payments: SummaryPayment[],
) {
  return calculatePaymentSummary(
    750_000,
    'CONFIRMED',
    payments,
    now,
  );
}

describe(
  'Step 7.1 — shared payment calculations',
  () => {
    it(
      'shows an unpaid active booking without inventing a payment',
      () => {
        expect(
          summarize([]),
        ).toMatchObject({
          status: 'UNPAID',
          collectedCentavos: 0,
          netPaidCentavos: 0,
          balanceDueCentavos: 750_000,
          requiresReview: false,
        });
      },
    );

    it(
      'distinguishes a completed receipt from a fully paid booking',
      () => {
        expect(
          summarize([
            receipt({
              amountCentavos: 250_000,
            }),
          ]),
        ).toMatchObject({
          status: 'PARTIALLY_PAID',
          netPaidCentavos: 250_000,
          balanceDueCentavos: 500_000,
        });
      },
    );

    it(
      'combines split completed receipts without changing their amounts',
      () => {
        const rows = [
          receipt({
            amountCentavos: 250_000,
          }),
          receipt({
            amountCentavos: 500_000,
          }),
        ];

        const before =
          structuredClone(rows);

        expect(
          summarize(rows),
        ).toMatchObject({
          status: 'PAID',
          netPaidCentavos: 750_000,
          balanceDueCentavos: 0,
        });

        expect(rows).toEqual(before);
      },
    );

    it(
      'excludes pending and failed amounts and reports an unresolved attempt',
      () => {
        expect(
          summarize([
            receipt({
              status: 'PENDING',
              paidAt: null,
            }),
            receipt({
              status: 'FAILED',
              paidAt: null,
            }),
          ]),
        ).toMatchObject({
          status: 'UNPAID',
          netPaidCentavos: 0,
          hasPendingPayment: true,
        });
      },
    );

    it(
      'subtracts completed refunds once and reserves pending refunds',
      () => {
        expect(
          summarize([
            receipt({
              status: 'PARTIALLY_REFUNDED',
              refunds: [
                {
                  amountCentavos: 100_000,
                  status: 'COMPLETED',
                },
                {
                  amountCentavos: 50_000,
                  status: 'PENDING',
                },
                {
                  amountCentavos: 25_000,
                  status: 'FAILED',
                },
                {
                  amountCentavos: 25_000,
                  status: 'CANCELLED',
                },
              ],
            }),
          ]),
        ).toMatchObject({
          collectedCentavos: 750_000,
          refundedCentavos: 100_000,
          pendingRefundCentavos: 50_000,
          netPaidCentavos: 650_000,
          balanceDueCentavos: 100_000,
          status: 'REVIEW_REQUIRED',
        });
      },
    );

    it(
      'recognizes full reimbursement without retaining the refunded money',
      () => {
        expect(
          summarize([
            receipt({
              status: 'REFUNDED',
              refunds: [
                {
                  amountCentavos: 750_000,
                  status: 'COMPLETED',
                },
              ],
            }),
          ]),
        ).toMatchObject({
          status: 'REFUNDED',
          netPaidCentavos: 0,
        });
      },
    );

    for (const status of [
      'CANCELLED',
      'EXPIRED',
      'CHECKED_OUT',
    ] as const) {
      it(
        `does not create a new balance due for ${status} history`,
        () => {
          expect(
            calculatePaymentSummary(
              750_000,
              status,
              [],
              now,
            ),
          ).toMatchObject({
            balanceDueCentavos: null,
            overpaidCentavos: null,
            requiresReview:
              status === 'CHECKED_OUT',
          });
        },
      );
    }

    it(
      'flags actual excess collections for review instead of hiding them',
      () => {
        expect(
          summarize([
            receipt({
              amountCentavos: 800_000,
            }),
          ]),
        ).toMatchObject({
          status: 'REVIEW_REQUIRED',
          overpaidCentavos: 50_000,
          netPaidCentavos: 800_000,
        });
      },
    );

    const invalidReceipts = [
      receipt({
        amountCentavos: -1,
      }),
      receipt({
        amountCentavos: 0,
      }),
      receipt({
        currency: 'USD',
      }),
      receipt({
        paidAt: null,
      }),
      receipt({
        paidAt:
          new Date('2026-11-02'),
      }),
      receipt({
        method: 'PAYMONGO',
      }),
      receipt({
        providerPaymentId: 'unverified',
      }),
      receipt({
        status: 'PARTIALLY_PAID',
      }),
      receipt({
        status: 'REFUNDED',
      }),
      receipt({
        refunds: [
          {
            amountCentavos: 800_000,
            status: 'PENDING',
          },
        ],
      }),
    ];

    for (const invalid of invalidReceipts) {
      it(
        `rejects ambiguous financial data: ${JSON.stringify(invalid)}`,
        () => {
          expect(
            () => summarize([invalid]),
          ).toThrow('financial review');
        },
      );
    }

    it(
      'rejects unsafe accumulated amounts',
      () => {
        expect(
          () =>
            summarize([
              receipt({
                amountCentavos:
                  Number.MAX_SAFE_INTEGER,
              }),
              receipt(),
            ]),
        ).toThrow('financial review');
      },
    );
  },
);