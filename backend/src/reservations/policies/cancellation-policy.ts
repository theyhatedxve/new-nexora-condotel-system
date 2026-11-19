// Current unpaid flow only.
// Prepaid fee/refund enforcement belongs to Phase 7.
export const UNPAID_CANCELLATION_POLICY = {
  version: 'unpaid-cancellation-v1',
  cancellationFeeCentavos: 0,
  refundAmountCentavos: 0,
  text:
    'Unpaid reservations can be cancelled without a cancellation fee before check-in. ' +
    'Contact the property to request cancellation.',
  eligibility: 'NO_PAYMENT_RECORDS_BEFORE_CHECK_IN',
} as const;