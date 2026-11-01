import 'reflect-metadata';

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';

import { resolve } from 'node:path';

import { ConflictException } from '@nestjs/common';

import {
  PrismaBetterSqlite3,
} from '@prisma/adapter-better-sqlite3';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  PrismaClient,
} from '../generated/prisma/client.js';

import type {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  ReservationValidationService,
} from './reservation-validation.service.js';

import {
  HOLD_DURATION_MS,
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

let directory: string;
let clients: PrismaClient[];
let services: ReservationAcquisitionService[];
let roomTypeId: string;
let roomId: string;

function date(offset: number) {
  return new Date(
    todayInPhilippines().getTime() +
    offset * 86_400_000,
  );
}

function input(start = 10, end = 13) {
  return {
    roomTypeId,
    checkIn: date(start).toISOString().slice(0, 10),
    checkOut: date(end).toISOString().slice(0, 10),
    guests: 2,
    firstName: 'Test',
    lastName: 'Guest',
    email: 'test@example.test',
  };
}

async function seed(
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'CHECKED_IN'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'CHECKED_OUT',
  holdExpiresAt: Date | null = null,
  start = 10,
  end = 13,
) {
  return clients[0].reservation.create({
    data: {
      reservationNumber: crypto.randomUUID(),

      guest: {
        create: {
          firstName: 'Existing',
          lastName: 'Guest',
        },
      },

      roomType: {
        connect: {
          id: roomTypeId,
        },
      },

      status,
      holdExpiresAt,
      checkInDate: date(start),
      checkOutDate: date(end),
      guestCount: 2,
      nightlyRateCentavos: 250_000,
      totalAmountCentavos: 750_000,
    },
  });
}

async function block(
  target: string,
  start: number,
  end: number,
  canceled = false,
) {
  return clients[0].roomBlock.create({
    data: {
      roomId: target,
      startDate: date(start),
      endDate: date(end),
      reason: 'Test',
      canceledAt: canceled ? new Date() : null,
    },
  });
}

describe(
  'Phase 6 Step 3 — isolated inventory acquisition',
  () => {
    beforeEach(async () => {
      // A new database in a new test-owned directory.
      // DATABASE_URL and dev.db are never used.
      directory = mkdtempSync(
        resolve(process.cwd(), '.phase6-step3-'),
      );

      const databasePath = resolve(
        directory,
        'inventory.test.db',
      ).replaceAll('\\', '/');

      const url = `file:${databasePath}`;

      clients = [0, 1].map(
        () =>
          new PrismaClient({
            adapter: new PrismaBetterSqlite3({
              url,
              timeout: 0,
            }),
          }),
      );

      await clients[0].$connect();

      const migrations = resolve(
        process.cwd(),
        'prisma/migrations',
      );

      // This simple statement runner is for the current
      // checked-in migrations, which contain no SQL triggers.
      const entries = readdirSync(migrations, {
        withFileTypes: true,
      })
        .filter((item) => item.isDirectory())
        .sort((a, b) =>
          a.name.localeCompare(b.name),
        );

      for (const entry of entries) {
        const sql = readFileSync(
          resolve(
            migrations,
            entry.name,
            'migration.sql',
          ),
          'utf8',
        );

        const statements = sql
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean);

        for (const statement of statements) {
          await clients[0]
            .$executeRawUnsafe(statement);
        }
      }

      await clients[1].$connect();

      services = clients.map((client) => {
        const db = client as PrismaService;

        return new ReservationAcquisitionService(
          db,
          new ReservationValidationService(
            db,
            new RoomRateCapacityService(),
          ),
        );
      });

      const property =
        await clients[0].property.create({
          data: {
            name: 'Test Property',
            address: 'Test',
            city: 'Test',
            province: 'Test',
          },
        });

      const type =
        await clients[0].roomType.create({
          data: {
            propertyId: property.id,
            name: 'Deluxe',
            capacity: 2,
            baseRateCentavos: 250_000,
          },
        });

      roomTypeId = type.id;

      const room =
        await clients[0].room.create({
          data: {
            roomTypeId,
            roomNumber: '101',
          },
        });

      roomId = room.id;
    });

    afterEach(async () => {
      for (const client of clients ?? []) {
        await client.$disconnect();
      }

      // Delete only this test's generated directory.
      const root = resolve(process.cwd());

      if (
        directory &&
        directory.startsWith(
          resolve(root, '.phase6-step3-'),
        ) &&
        resolve(directory, '..') === root
      ) {
        rmSync(directory, {
          recursive: true,
          force: true,
        });
      }
    });

    it(
      'creates a 15-minute hold and trusted price snapshots without payments or assignments',
      async () => {
        const start = Date.now();

        const result =
          await services[0].acquire(
            input(),
            'HOLD',
          );

        expect(result.status).toBe('PENDING');

        expect(
          result.holdExpiresAt!.getTime(),
        ).toBeGreaterThanOrEqual(
          start + HOLD_DURATION_MS,
        );

        expect(
          result.holdExpiresAt!.getTime(),
        ).toBeLessThanOrEqual(
          Date.now() + HOLD_DURATION_MS,
        );

        expect(
          result.nightlyRateCentavos,
        ).toBe(250_000);

        expect(
          result.totalAmountCentavos,
        ).toBe(750_000);

        await clients[0].roomType.update({
          where: {
            id: roomTypeId,
          },
          data: {
            baseRateCentavos: 300_000,
          },
        });

        const stored =
          await clients[0].reservation
            .findUniqueOrThrow({
              where: {
                id: result.id,
              },
            });

        expect(
          stored.nightlyRateCentavos,
        ).toBe(250_000);

        expect(
          await clients[0].payment.count(),
        ).toBe(0);

        expect(
          await clients[0].roomAssignment.count(),
        ).toBe(0);
      },
    );

    it(
      'creates a confirmed pay-at-property reservation without claiming payment',
      async () => {
        const result =
          await services[0].acquire(
            input(),
            'CONFIRMED',
          );

        expect(result.status).toBe('CONFIRMED');
        expect(result.holdExpiresAt).toBeNull();
      },
    );

    it(
      'allows exactly one of two independent clients to acquire the last room',
      async () => {
        const results =
          await Promise.allSettled(
            services.map((service) =>
              service.acquire(input(), 'HOLD'),
            ),
          );

        const successes = results.filter(
          (result) =>
            result.status === 'fulfilled',
        );

        expect(successes).toHaveLength(1);

        const failed = results.find(
          (result) =>
            result.status === 'rejected',
        );

        expect(
          failed?.status === 'rejected' &&
          failed.reason,
        ).toBeInstanceOf(ConflictException);

        expect(
          await clients[0].reservation.count(),
        ).toBe(1);

        expect(
          await clients[0].guest.count(),
        ).toBe(1);
      },
    );

    it(
      'lets both independent clients succeed when two rooms exist',
      async () => {
        await clients[0].room.create({
          data: {
            roomTypeId,
            roomNumber: '102',
          },
        });

        const results =
          await Promise.allSettled(
            services.map((service) =>
              service.acquire(input(), 'HOLD'),
            ),
          );

        expect(
          results.filter(
            (result) =>
              result.status === 'fulfilled',
          ),
        ).toHaveLength(2);

        expect(
          await clients[0].reservation.count(),
        ).toBe(2);
      },
    );

    for (
      const status of [
        'CONFIRMED',
        'CHECKED_IN',
        'PENDING',
      ] as const
    ) {
      it(
        `counts ${status} inventory including legacy null-expiry pending`,
        async () => {
          await seed(status);

          await expect(
            services[0].acquire(input(), 'HOLD'),
          ).rejects.toBeInstanceOf(
            ConflictException,
          );
        },
      );
    }

    it(
      'counts an unexpired pending hold',
      async () => {
        await seed(
          'PENDING',
          new Date(Date.now() + 60_000),
        );

        await expect(
          services[0].acquire(input(), 'HOLD'),
        ).rejects.toBeInstanceOf(
          ConflictException,
        );
      },
    );

    it(
      'expires an old hold and immediately reuses its capacity',
      async () => {
        const old = await seed(
          'PENDING',
          new Date(Date.now() - 1),
        );

        await services[0].acquire(
          input(),
          'HOLD',
        );

        const stored =
          await clients[0].reservation
            .findUniqueOrThrow({
              where: {
                id: old.id,
              },
            });

        expect(stored.status).toBe('EXPIRED');
      },
    );

    for (
      const status of [
        'CANCELLED',
        'EXPIRED',
        'CHECKED_OUT',
      ] as const
    ) {
      it(
        `ignores ${status} inventory`,
        async () => {
          await seed(status);

          await expect(
            services[0].acquire(input(), 'HOLD'),
          ).resolves.toHaveProperty(
            'status',
            'PENDING',
          );
        },
      );
    }

    it('allows back-to-back stays', async () => {
      await seed('CONFIRMED', null, 7, 10);

      await expect(
        services[0].acquire(input(), 'HOLD'),
      ).resolves.toHaveProperty(
        'status',
        'PENDING',
      );
    });

    it('rejects active dated blocks', async () => {
      await block(roomId, 11, 12);

      await expect(
        services[0].acquire(input(), 'HOLD'),
      ).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('ignores canceled blocks', async () => {
      await block(roomId, 11, 12, true);

      await expect(
        services[0].acquire(input(), 'HOLD'),
      ).resolves.toHaveProperty(
        'status',
        'PENDING',
      );
    });

    it(
      'rejects fragmented rooms even when each night has capacity',
      async () => {
        const second =
          await clients[0].room.create({
            data: {
              roomTypeId,
              roomNumber: '102',
            },
          });

        await block(roomId, 10, 11);
        await block(second.id, 11, 13);

        await expect(
          services[0].acquire(input(), 'HOLD'),
        ).rejects.toBeInstanceOf(
          ConflictException,
        );
      },
    );

    it(
      'counts an assigned reservation once, leaving the second room available',
      async () => {
        await clients[0].room.create({
          data: {
            roomTypeId,
            roomNumber: '102',
          },
        });

        const old = await seed('CONFIRMED');

        await clients[0].roomAssignment.create({
          data: {
            reservationId: old.id,
            roomId,
          },
        });

        await expect(
          services[0].acquire(input(), 'HOLD'),
        ).resolves.toHaveProperty(
          'status',
          'PENDING',
        );
      },
    );

    it(
      'checks indirect overlaps outside the requested dates',
      async () => {
        const second =
          await clients[0].room.create({
            data: {
              roomTypeId,
              roomNumber: '102',
            },
          });

        await seed(
          'CONFIRMED',
          null,
          10,
          14,
        );

        const fixed = await seed(
          'CONFIRMED',
          null,
          13,
          15,
        );

        await clients[0].roomAssignment.create({
          data: {
            reservationId: fixed.id,
            roomId,
          },
        });

        await block(second.id, 10, 11);

        // The requested stay is [11,13).
        // The long reservation cannot move to room 102
        // because that room is blocked on its first night.
        await expect(
          services[0].acquire(
            input(11, 13),
            'HOLD',
          ),
        ).rejects.toBeInstanceOf(
          ConflictException,
        );
      },
    );

    for (
      const status of [
        'MAINTENANCE',
        'OUT_OF_SERVICE',
      ] as const
    ) {
      it(
        `excludes ${status} rooms`,
        async () => {
          await clients[0].room.update({
            where: {
              id: roomId,
            },
            data: {
              status,
            },
          });

          await expect(
            services[0].acquire(input(), 'HOLD'),
          ).rejects.toBeInstanceOf(
            ConflictException,
          );
        },
      );
    }

    it('rejects an inactive room', async () => {
      await clients[0].room.update({
        where: {
          id: roomId,
        },
        data: {
          isActive: false,
        },
      });

      await expect(
        services[0].acquire(input(), 'HOLD'),
      ).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it(
      'requires a ready room for an arrival today',
      async () => {
        await clients[0].room.update({
          where: {
            id: roomId,
          },
          data: {
            status: 'CLEANING',
          },
        });

        await expect(
          services[0].acquire(
            input(0, 2),
            'HOLD',
          ),
        ).rejects.toBeInstanceOf(
          ConflictException,
        );

        await expect(
          services[0].acquire(input(), 'HOLD'),
        ).resolves.toHaveProperty(
          'status',
          'PENDING',
        );
      },
    );

    it(
      'rejects totals outside the database integer range without writing a guest',
      async () => {
        await clients[0].roomType.update({
          where: {
            id: roomTypeId,
          },
          data: {
            baseRateCentavos: 2_147_483_647,
          },
        });

        await expect(
          services[0].acquire(input(), 'HOLD'),
        ).rejects.toThrow('Stay total');

        expect(
          await clients[0].guest.count(),
        ).toBe(0);
      },
    );

    it(
      'rejects client price/status overrides',
      async () => {
        await expect(
          services[0].acquire(
            {
              ...input(),
              status: 'CONFIRMED',
            } as ReturnType<typeof input>,
            'HOLD',
          ),
        ).rejects.toThrow(
          'Invalid reservation details',
        );

        expect(
          await clients[0].reservation.count(),
        ).toBe(0);
      },
    );

    it(
      'rolls back the new guest, reservation and expiration when persistence fails',
      async () => {
        const old = await seed(
          'PENDING',
          new Date(Date.now() - 1),
        );

        await clients[0].$executeRawUnsafe(`
          CREATE TRIGGER reject_test_booking
          BEFORE INSERT ON "Reservation"
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only persistence failure'
            );
          END
        `);

        await expect(
          services[0].acquire(input(), 'HOLD'),
        ).rejects.toThrow();

        expect(
          await clients[0].reservation.count(),
        ).toBe(1);

        expect(
          await clients[0].guest.count(),
        ).toBe(1);

        const stored =
          await clients[0].reservation
            .findUniqueOrThrow({
              where: {
                id: old.id,
              },
            });

        expect(stored.status).toBe('PENDING');
      },
    );
  },
);