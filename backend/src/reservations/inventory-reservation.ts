import type { Prisma } from '../generated/prisma/client.js';

// An unresolved payment must not silently release inventory at its deadline.
export function inventoryReservationWhere(now: Date): Prisma.ReservationWhereInput {
  return {
    OR: [
      { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      {
        status: 'PENDING',
        OR: [
          { holdExpiresAt: null },
          { holdExpiresAt: { gt: now } },
          { payments: { some: {} } },
        ],
      },
    ],
  };
}
