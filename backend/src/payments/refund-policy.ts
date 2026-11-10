import { createHash } from 'node:crypto';

export const ROLES = ['ADMIN', 'MANAGER'];

export const CLAIM = 'payment.refund.requested';

export const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export const fingerprint = (
  paymentId: string,
  actorId: string,
  amountCentavos: number,
  reason: string,
  cash: boolean,
) =>
  hash(
    JSON.stringify({
      operation: 'refund-v1',
      paymentId,
      actorId,
      amountCentavos,
      reason,
      cashReturnedConfirmed: cash,
    }),
  );
