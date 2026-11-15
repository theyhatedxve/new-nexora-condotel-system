import type { Prisma } from '../generated/prisma/client.js';

export async function synchronizeNightlyRate(
  tx: Prisma.TransactionClient,
  roomTypeId: string,
  rateCentavos: number,
): Promise<void> {
  await tx.rentalRate.upsert({
    where: { roomTypeId_rentalType: { roomTypeId, rentalType: 'NIGHTLY' } },
    update: { rateCentavos, isActive: true },
    create: {
      roomTypeId,
      rentalType: 'NIGHTLY',
      rateCentavos,
      extraPersonFeeCentavos: 0,
    },
  });
}
