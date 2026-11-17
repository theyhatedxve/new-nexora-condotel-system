import { createHash } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';

export async function enqueueBookingConfirmationInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
): Promise<void> {
  const id = 'confirmation-' + createHash('sha256')
    .update(reservationId)
    .digest('hex');

  await tx.bookingNotification.upsert({
    where: { id },
    create: {
      id,
      reservationId,
      templateKey: 'RESERVATION_CONFIRMED',
    },
    update: {},
  });
}
