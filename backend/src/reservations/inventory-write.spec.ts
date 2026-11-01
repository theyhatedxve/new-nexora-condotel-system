import 'reflect-metadata';

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';

import { resolve } from 'node:path';

import { ConflictException } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { PrismaClient } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import { RoomsService } from '../rooms/rooms.service.js';
import { RoomStatusService } from '../rooms/room-status.service.js';
import { RoomTypesService } from '../room-types/room-types.service.js';
import { RoomBlocksService } from '../room-blocks/room-blocks.service.js';

import {
  ReservationValidationService,
} from './reservation-validation.service.js';

import {
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

let directory: string;
let clients: PrismaClient[];

let rooms: RoomsService;
let statuses: RoomStatusService;
let types: RoomTypesService;
let blocks: RoomBlocksService;
let acquire: ReservationAcquisitionService;

let roomId: string;
let roomTypeId: string;
let propertyId: string;

function date(days: number) {
  return new Date(
    todayInPhilippines().getTime() +
    days * 86_400_000,
  );
}

function textDate(days: number) {
  return date(days).toISOString().slice(0, 10);
}

function request() {
  return {
    roomTypeId,
    checkIn: textDate(10),
    checkOut: textDate(13),
    guests: 2,
    firstName: 'Test',
    lastName: 'Guest',
    email: 'test@example.test',
  };
}

function blockRequest(start = 10, end = 13) {
  return {
    startDate: textDate(start),
    endDate: textDate(end),
    reason: 'Test maintenance',
  };
}

async function addRoom() {
  return clients[0].room.create({
    data: {
      roomTypeId,
      roomNumber: '102',
    },
  });
}

describe(
  'Step 3 — protect existing inventory commitments',
  () => {
    beforeEach(async () => {
      directory = mkdtempSync(
        resolve(process.cwd(), '.phase6-protection-'),
      );

      const databasePath = resolve(
        directory,
        'inventory.test.db',
      ).replaceAll('\\', '/');

      const url = `file:${databasePath}`;

      clients = [0, 1].map(
        () => new PrismaClient({
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

      // Suitable for the current checked-in migrations.
      // These migration files contain no SQL triggers.
      const entries = readdirSync(migrations, {
        withFileTypes: true,
      })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));

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
          await clients[0].$executeRawUnsafe(statement);
        }
      }

      await clients[1].$connect();

      const db = clients[0] as PrismaService;
      const other = clients[1] as PrismaService;

      rooms = new RoomsService(db);
      statuses = new RoomStatusService(db);
      types = new RoomTypesService(
        db,
        new RoomRateCapacityService(),
      );
      blocks = new RoomBlocksService(db);

      acquire = new ReservationAcquisitionService(
        other,
        new ReservationValidationService(
          other,
          new RoomRateCapacityService(),
        ),
      );

      const property = await db.property.create({
        data: {
          name: 'Test Property',
          address: 'Test',
          city: 'Test',
          province: 'Test',
        },
      });

      propertyId = property.id;

      const type = await db.roomType.create({
        data: {
          propertyId,
          name: 'Deluxe',
          capacity: 2,
          baseRateCentavos: 250_000,
        },
      });

      roomTypeId = type.id;

      const room = await db.room.create({
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

      const root = resolve(process.cwd());

      // Remove only this test's generated directory.
      if (
        directory &&
        directory.startsWith(
          resolve(root, '.phase6-protection-'),
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
      'rolls back a block that would displace an unassigned confirmed booking',
      async () => {
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          blocks.create(roomId, blockRequest()),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(
          await clients[0].roomBlock.count(),
        ).toBe(0);
      },
    );

    it('protects an unexpired pending hold', async () => {
      await acquire.acquire(request(), 'HOLD');

      await expect(
        blocks.create(roomId, blockRequest()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it(
      'does not reserve capacity for an expired unassigned hold',
      async () => {
        const booking = await acquire.acquire(
          request(),
          'HOLD',
        );

        await clients[0].reservation.update({
          where: {
            id: booking.id,
          },
          data: {
            holdExpiresAt: new Date(Date.now() - 1),
          },
        });

        await expect(
          blocks.create(roomId, blockRequest()),
        ).resolves.toHaveProperty('roomId', roomId);
      },
    );

    it(
      'allows a block when another room can honor the booking',
      async () => {
        await addRoom();
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          blocks.create(roomId, blockRequest()),
        ).resolves.toHaveProperty('roomId', roomId);
      },
    );

    it(
      'rolls back a block edit that would displace a booking',
      async () => {
        const block = await blocks.create(
          roomId,
          blockRequest(20, 22),
        );

        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          blocks.update(
            roomId,
            block.id,
            blockRequest(),
          ),
        ).rejects.toBeInstanceOf(ConflictException);

        const stored =
          await clients[0].roomBlock.findUniqueOrThrow({
            where: {
              id: block.id,
            },
          });

        expect(stored.startDate).toEqual(date(20));
        expect(stored.endDate).toEqual(date(22));
      },
    );

    for (
      const status of [
        'MAINTENANCE',
        'OUT_OF_SERVICE',
      ] as const
    ) {
      it(
        `rolls back ${status} when the last room is promised`,
        async () => {
          await acquire.acquire(request(), 'CONFIRMED');

          await expect(
            statuses.update(roomId, status, 'MANAGER'),
          ).rejects.toBeInstanceOf(ConflictException);

          const stored =
            await clients[0].room.findUniqueOrThrow({
              where: {
                id: roomId,
              },
            });

          expect(stored.status).toBe('READY');
        },
      );
    }

    it(
      'allows maintenance when spare inventory exists',
      async () => {
        await addRoom();
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          statuses.update(
            roomId,
            'MAINTENANCE',
            'MANAGER',
          ),
        ).resolves.toHaveProperty(
          'status',
          'MAINTENANCE',
        );
      },
    );

    it(
      'rolls back deactivation of the last room',
      async () => {
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          rooms.update(roomId, {
            isActive: false,
          }),
        ).rejects.toBeInstanceOf(ConflictException);

        const stored =
          await clients[0].room.findUniqueOrThrow({
            where: {
              id: roomId,
            },
          });

        expect(stored.isActive).toBe(true);
      },
    );

    it(
      'allows deactivation when another room can honor the booking',
      async () => {
        await addRoom();
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          rooms.update(roomId, {
            isActive: false,
          }),
        ).resolves.toHaveProperty('isActive', false);
      },
    );

    it(
      'rolls back reclassification of the last promised room',
      async () => {
        const other =
          await clients[0].roomType.create({
            data: {
              propertyId,
              name: 'Other',
              capacity: 2,
              baseRateCentavos: 300_000,
            },
          });

        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          rooms.update(roomId, {
            roomTypeId: other.id,
          }),
        ).rejects.toBeInstanceOf(ConflictException);

        const stored =
          await clients[0].room.findUniqueOrThrow({
            where: {
              id: roomId,
            },
          });

        expect(stored.roomTypeId).toBe(roomTypeId);
      },
    );

    it(
      'preserves fixed assignments instead of moving them to a spare room',
      async () => {
        await addRoom();

        const booking = await acquire.acquire(
          request(),
          'CONFIRMED',
        );

        await clients[0].roomAssignment.create({
          data: {
            reservationId: booking.id,
            roomId,
          },
        });

        await expect(
          statuses.update(
            roomId,
            'MAINTENANCE',
            'MANAGER',
          ),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it(
      'allows a released room to be blocked or deactivated when another room can honor the booking',
      async () => {
        await addRoom();

        const booking = await acquire.acquire(
          request(),
          'CONFIRMED',
        );

        const assignment =
          await clients[0].roomAssignment.create({
            data: {
              reservationId: booking.id,
              roomId,
            },
          });

        await clients[0].roomAssignment.update({
          where: {
            id: assignment.id,
          },
          data: {
            releasedAt: new Date(),
          },
        });

        const block = await blocks.create(
          roomId,
          blockRequest(),
        );

        expect(block.roomId).toBe(roomId);

        await blocks.cancel(roomId, block.id);

        await expect(
          rooms.update(roomId, {
            isActive: false,
          }),
        ).resolves.toHaveProperty('isActive', false);
      },
    );

    it(
      'rejects room-type capacity below a promised guest count',
      async () => {
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          types.update(roomTypeId, {
            capacity: 1,
          }),
        ).rejects.toBeInstanceOf(ConflictException);

        const stored =
          await clients[0].roomType.findUniqueOrThrow({
            where: {
              id: roomTypeId,
            },
          });

        expect(stored.capacity).toBe(2);
      },
    );

    it(
      'rejects deactivation of a room type with an unassigned booking',
      async () => {
        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          types.update(roomTypeId, {
            isActive: false,
          }),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it(
      'preserves stored prices when current room rates change',
      async () => {
        const booking = await acquire.acquire(
          request(),
          'CONFIRMED',
        );

        await types.update(roomTypeId, {
          baseRateCentavos: 300_000,
        });

        const stored =
          await clients[0].reservation.findUniqueOrThrow({
            where: {
              id: booking.id,
            },
          });

        expect(
          stored.nightlyRateCentavos,
        ).toBe(250_000);

        expect(
          stored.totalAmountCentavos,
        ).toBe(750_000);
      },
    );

    it(
      'rejects fragmentation even when different rooms remain free each night',
      async () => {
        const other = await addRoom();

        await blocks.create(
          roomId,
          blockRequest(10, 11),
        );

        await acquire.acquire(request(), 'CONFIRMED');

        await expect(
          blocks.create(
            other.id,
            blockRequest(11, 13),
          ),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(
          await clients[0].roomBlock.count(),
        ).toBe(1);
      },
    );

    it(
      'serializes a concurrent booking and a block of the last room',
      async () => {
        const results = await Promise.allSettled([
          acquire.acquire(request(), 'CONFIRMED'),
          blocks.create(roomId, blockRequest()),
        ]);

        expect(
          results.filter(
            (result) =>
              result.status === 'fulfilled',
          ),
        ).toHaveLength(1);

        const failure = results.find(
          (result) =>
            result.status === 'rejected',
        );

        expect(
          failure?.status === 'rejected' &&
          failure.reason,
        ).toBeInstanceOf(ConflictException);

        const reservationCount =
          await clients[0].reservation.count();

        const blockCount =
          await clients[0].roomBlock.count();

        expect(
          reservationCount + blockCount,
        ).toBe(1);
      },
    );
  },
);