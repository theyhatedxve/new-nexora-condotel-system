import { setTimeout as delay } from 'node:timers/promises';

import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  assertAllocatable,
  connectedStays,
  type Stay,
} from './room-allocation.js';

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const value = error as {
    code?: string;
    meta?: unknown;
    cause?: unknown;
  };

  return (
    [
      'P1008',
      'P2034',
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
    ].includes(value.code ?? '') ||
    JSON.stringify(value.meta ?? {})
      .includes('SocketTimeout') ||
    (
      value.cause !== error &&
      isRetryable(value.cause)
    )
  );
}

// SQLite-specific transaction wrapper.
// All reads used to decide a write belong inside work().
export async function withInventoryWrite<T>(
  prisma: Pick<PrismaService, '$transaction'>,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`
            UPDATE "Property"
            SET "id" = "id"
          `;

          return work(tx);
        },
        {
          maxWait: 1000,
          timeout: 10_000,
        },
      );
    } catch (error) {
      if (!isRetryable(error)) {
        throw error;
      }

      if (attempt === 4) {
        throw new ServiceUnavailableException(
          'Inventory is busy. Please try again.',
        );
      }

      await delay(25 * (attempt + 1));
    }
  }

  throw new ServiceUnavailableException(
    'Inventory is busy.',
  );
}

// Call AFTER staging an inventory-reducing change,
// inside the SAME transaction.
//
// If this throws, the staged change rolls back.
export async function assertInventoryCommitments(
  tx: Prisma.TransactionClient,
  roomTypeIds: string[],
): Promise<void> {
  const now = new Date();
  const today = todayInPhilippines();

  for (const roomTypeId of new Set(roomTypeIds)) {
    const reservations = await tx.reservation.findMany({
      where: {
        checkOutDate: {
          gt: today,
        },

        OR: [
          {
            roomTypeId,
          },
          {
            roomAssignments: {
              some: {
                releasedAt: null,
                room: {
                  roomTypeId,
                },
              },
            },
          },
        ],

        AND: [
          {
            OR: [
              {
                status: {
                  in: ['CONFIRMED', 'CHECKED_IN'],
                },
              },
              {
                status: 'PENDING',
                OR: [
                  {
                    holdExpiresAt: null,
                  },
                  {
                    holdExpiresAt: {
                      gt: now,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },

      include: {
        roomAssignments: {
          where: {
            releasedAt: null,
          },
        },
      },
    });

    if (reservations.length === 0) {
      continue;
    }

    const type = await tx.roomType.findUnique({
      where: {
        id: roomTypeId,
      },
    });

    if (
      !type?.isActive ||
      reservations.some(
        (reservation) =>
          reservation.roomTypeId !== roomTypeId ||
          reservation.guestCount > type.capacity,
      )
    ) {
      throw new ConflictException(
        'This change would invalidate an existing reservation.',
      );
    }

    const rooms = await tx.room.findMany({
      where: {
        roomTypeId,
        isActive: true,
        status: {
          notIn: ['MAINTENANCE', 'OUT_OF_SERVICE'],
        },
      },

      include: {
        roomBlocks: {
          where: {
            canceledAt: null,
          },
        },
      },
    });

    let remaining: Stay[] = reservations.map(
      (reservation) => ({
        id: reservation.id,

        // Only the remaining stay needs inventory.
        start:
          reservation.checkInDate < today
            ? today
            : reservation.checkInDate,

        end: reservation.checkOutDate,

        roomIds: reservation.roomAssignments.map(
          (assignment) => assignment.roomId,
        ),
      }),
    );

    // Check each connected group separately so
    // unrelated booking periods do not share a search limit.
    while (remaining.length > 0) {
      const [first, ...others] = remaining;

      const component = connectedStays(
        first,
        others,
      );

      assertAllocatable(
        rooms.map((room) => ({
          ...room,
          blocks: room.roomBlocks,
        })),
        component,
      );

      const checked = new Set(
        component.map((stay) => stay.id),
      );

      remaining = remaining.filter(
        (stay) => !checked.has(stay.id),
      );
    }
  }
}

export async function assertRoomInventoryCommitments(
  tx: Prisma.TransactionClient,
  roomId: string,
): Promise<void> {
  const room = await tx.room.findUniqueOrThrow({
    where: {
      id: roomId,
    },
    select: {
      roomTypeId: true,
    },
  });

  await assertInventoryCommitments(
    tx,
    [room.roomTypeId],
  );
}