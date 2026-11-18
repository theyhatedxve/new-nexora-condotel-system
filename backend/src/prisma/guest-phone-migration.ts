import type { PrismaClient } from '../generated/prisma/client.js';
import {
  GUEST_PHONE_PREFIX,
  activeGuestPhoneKeyId,
  decryptGuestPhone,
  encryptGuestPhone,
} from '../common/security/guest-phone.crypto.js';

export async function migrateGuestPhones(
  prisma: PrismaClient,
  apply: boolean,
) {
  const activeId = activeGuestPhoneKeyId();

  return prisma.$transaction(async (tx) => {
    let cursor: string | undefined;
    let examined = 0;
    let candidates = 0;
    let updated = 0;

    for (;;) {
      const rows = await tx.guest.findMany({
        where: {
          phone: { not: null },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: { id: true, phone: true },
        orderBy: { id: 'asc' },
        take: 100,
      });

      if (rows.length === 0) break;

      for (const row of rows) {
        if (row.phone === null) continue;

        examined += 1;
        const plaintext = decryptGuestPhone(row.phone, row.id);

        if (row.phone.startsWith(GUEST_PHONE_PREFIX + activeId + ':')) {
          continue;
        }

        candidates += 1;

        if (apply) {
          const result = await tx.guest.updateMany({
            where: { id: row.id, phone: row.phone },
            data: {
              phone: encryptGuestPhone(plaintext, row.id),
            },
          });

          if (result.count !== 1) {
            throw new Error('Guest phone changed during conversion.');
          }

          updated += 1;
        }
      }

      cursor = rows[rows.length - 1].id;
      if (rows.length < 100) break;
    }

    return { examined, candidates, updated };
  }, { timeout: 30_000 });
}