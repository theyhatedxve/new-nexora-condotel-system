
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import { RoomTypesService } from './room-types.service.js';

import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';

const testDb = resolve(process.cwd(), 'phase4.step1.test.db');
const devDb = resolve(process.cwd(), 'dev.db');

const suffix = randomUUID();

let prisma: PrismaClient;
let service: RoomTypesService;

let propertyId: string;
let firstRoomTypeId: string;
let guestId: string;
let userId: string;
let reservationId: string;

function assertTestDatabase(): void {
  if (
    process.cwd().split(/[\\/]/).at(-1) !== 'backend'
  ) {
    throw new Error('Run Vitest from backend/.');
  }

  if (!existsSync(testDb)) {
    throw new Error(
      'Missing phase4.step1.test.db. Apply migrations first.',
    );
  }

  if (
    existsSync(devDb) &&
    realpathSync(testDb) === realpathSync(devDb)
  ) {
    throw new Error(
      'Refusing to run tests against dev.db.',
    );
  }
}

describe('Phase 4 Step 1 — RoomTypesService', () => {
  beforeAll(async () => {
    assertTestDatabase();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./phase4.step1.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    // Keep the setup independent of development seeds.
    const property = await prisma.property.create({
      data: {
        name: `Phase 4 Test Property ${suffix}`,
        address: 'Test Address',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    propertyId = property.id;

    service = new RoomTypesService(
    prisma as never,
    new RoomRateCapacityService(),
    );
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

    try {
      // Remove only this suite's test fixtures.
      if (reservationId) {
        await prisma.reservation.deleteMany({
          where: { id: reservationId },
        });
      }

      if (guestId) {
        await prisma.guest.deleteMany({
          where: { id: guestId },
        });
      }

      if (userId) {
        await prisma.user.deleteMany({
          where: { id: userId },
        });
      }

      await prisma.roomType.deleteMany({
        where: { propertyId },
      });

      await prisma.property.deleteMany({
        where: { id: propertyId },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('creates a room type with the configured property', async () => {
    const created = await service.create({
      name: `Deluxe ${suffix}`,
      description: 'Spacious deluxe room',
      capacity: 2,
      baseRateCentavos: 250000,
    });

    firstRoomTypeId = created.id;

    expect(created.propertyId).toBe(propertyId);
    expect(created.capacity).toBe(2);
    expect(created.baseRateCentavos).toBe(250000);
    expect(created.isActive).toBe(true);
  });

  it('lists active room types using public fields', async () => {
    const results = await service.findAll();

    const created = results.find(
      (roomType) => roomType.id === firstRoomTypeId,
    );

    expect(created).toBeDefined();
    expect(created?.name).toContain('Deluxe');

    expect(created).not.toHaveProperty('propertyId');
    expect(created).not.toHaveProperty('isActive');
    expect(created).not.toHaveProperty('createdAt');
  });

  it('returns the active room type by ID', async () => {
    const result = await service.findOne(firstRoomTypeId);

    expect(result.id).toBe(firstRoomTypeId);
    expect(result.capacity).toBe(2);
  });

  it('rejects duplicate room type names', async () => {
    await expect(
      service.create({
        name: `Deluxe ${suffix}`,
        capacity: 2,
        baseRateCentavos: 250000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates capacity and price', async () => {
    const updated = await service.update(firstRoomTypeId, {
      capacity: 4,
      baseRateCentavos: 300000,
    });

    expect(updated.capacity).toBe(4);
    expect(updated.baseRateCentavos).toBe(300000);
  });

  it('rejects empty updates and unknown IDs', async () => {
    await expect(
      service.update(firstRoomTypeId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.findOne('nonexistent-room-type'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('protects capacity and active status when reservations exist', async () => {
    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Phase 4 Test Guest',
        email: `phase4-${suffix}@example.invalid`,
        passwordHash: 'test-fixture-not-for-login',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });

    userId = user.id;

    const guest = await prisma.guest.create({
      data: {
        userId,
        firstName: 'Test',
        lastName: 'Guest',
      },
    });

    guestId = guest.id;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber: `P4-${suffix}`,
        guestId,
        roomTypeId: firstRoomTypeId,
        guestCount: 3,
        checkInDate: new Date('2027-01-01T00:00:00Z'),
        checkOutDate: new Date('2027-01-05T00:00:00Z'),
        nightlyRateCentavos: 300000,
        totalAmountCentavos: 1200000,
        status: 'CONFIRMED',
      },
    });

    reservationId = reservation.id;

    await expect(
      service.update(firstRoomTypeId, {
        capacity: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.update(firstRoomTypeId, {
        isActive: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not rewrite reservation price snapshots', async () => {
    await service.update(firstRoomTypeId, {
      baseRateCentavos: 500000,
    });

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        nightlyRateCentavos: true,
        totalAmountCentavos: true,
      },
    });

    expect(reservation?.nightlyRateCentavos).toBe(300000);
    expect(reservation?.totalAmountCentavos).toBe(1200000);
  });
});
