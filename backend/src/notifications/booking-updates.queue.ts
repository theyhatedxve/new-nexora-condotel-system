import { createHash } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';

export const PAYMENT_UPDATE_PREFIX = 'PAYMENT_RECORDED:';
export const CANCELLATION_TEMPLATE = 'RESERVATION_CANCELLED';
export const REFUND_COMPLETION_PREFIX = 'REFUND_COMPLETED:';

async function enqueueInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
  templateKey: string,
): Promise<void> {
  const id = 'booking-update-' + createHash('sha256')
    .update(JSON.stringify([reservationId, templateKey]))
    .digest('hex');

  await tx.bookingNotification.upsert({
    where: { reservationId_templateKey: { reservationId, templateKey } },
    create: { id, reservationId, templateKey },
    update: {},
  });
}

export async function enqueuePaymentUpdateInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
  paymentId: string,
): Promise<void> {
  await enqueueInTx(tx, reservationId, PAYMENT_UPDATE_PREFIX + paymentId);
}

export async function enqueueBookingCancellationInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
): Promise<void> {
  await enqueueInTx(tx, reservationId, CANCELLATION_TEMPLATE);
}

export async function enqueueRefundCompletionInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
  refundId: string,
): Promise<void> {
  await enqueueInTx(tx, reservationId, REFUND_COMPLETION_PREFIX + refundId);
}
