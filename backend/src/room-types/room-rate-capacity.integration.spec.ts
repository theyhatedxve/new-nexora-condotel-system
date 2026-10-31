
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

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';

const testDatabase = resolve(
  process.cwd(),
  'phase4.step5.test.db',
);

const developmentDatabase = resolve(
  process.cwd(),
  'dev.db',
);

const suffix = randomUUID();

let prisma: PrismaClient;

let propertyId = '';
let roomTypeId = '';
let guestId = '';
let userId = '';
let reservationId = '';

const validator = new RoomRateCapacityService();

function futureDate(days: number): Date {
  const result = new Date();
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function verifyIsolation(): void {
  if (process.cwd().split(/[\\/]/).at(-1) !== 'backend') {
    throw new Error('Run tests from backend/.');
  }

  if (!existsSync(testDatabase)) {
    throw new Error(
      'Missing phase4.step5.test.db. Run migrations first.',
    );
  }

  if (
    existsSync(developmentDatabase) &&
    realpathSync(testDatabase) === realpathSync(developmentDatabase)
  ) {
    throw new Error(
      'Refusing to connect to backend/dev.db.',
    );
  }
}

describe('Phase 4 Step 5 — Rate Snapshot Integration', () => {
  beforeAll(async () => {
    verifyIsolation();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./phase4.step5.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    const property = await prisma.property.create({
      data: {
        name: `Step 5 Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    propertyId = property.id;

    const roomType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Rate Test Suite ${suffix}`,
        capacity: 2,
        baseRateCentavos: 250000,
      },
    });

    roomTypeId = roomType.id;

    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Rate Test Guest',
        email: `rate-${suffix}@example.invalid`,
        passwordHash: 'test-placeholder-not-a-real-password',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });

    userId = user.id;

    const guest = await prisma.guest.create({
      data: {
        userId,
        firstName: 'Rate',
        lastName: 'Tester',
      },
    });

    guestId = guest.id;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber: `RATE-${suffix}`,
        guestId,
        roomTypeId,
        guestCount: 2,
        checkInDate: futureDate(7),
        checkOutDate: futureDate(10),
        nightlyRateCentavos: 250000,
        totalAmountCentavos: 750000,
        status: 'CONFIRMED',
      },
    });

    reservationId = reservation.id;
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
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

      if (roomTypeId) {
        await prisma.roomType.deleteMany({
          where: { id: roomTypeId },
        });
      }

      if (propertyId) {
        await prisma.property.deleteMany({
          where: { id: propertyId },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('preserves saved reservation amounts after a rate change', async () => {
    const before = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });

    const updatedRate = validator.validateBaseRate(300000);

    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { baseRateCentavos: updatedRate },
    });

    const roomType = await prisma.roomType.findUniqueOrThrow({
      where: { id: roomTypeId },
    });

    const after = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
    });

    expect(roomType.baseRateCentavos).toBe(300000);

    expect(after.nightlyRateCentavos).toBe(
      before.nightlyRateCentavos,
    );

    expect(after.totalAmountCentavos).toBe(
      before.totalAmountCentavos,
    );

    expect(after.nightlyRateCentavos).toBe(250000);
    expect(after.totalAmountCentavos).toBe(750000);
  });

  it('checks guest count against room-type capacity', async () => {
    const roomType = await prisma.roomType.findUniqueOrThrow({
      where: { id: roomTypeId },
    });

    expect(() =>
      validator.validateGuestCount(2, roomType.capacity),
    ).not.toThrow();

    expect(() =>
      validator.validateGuestCount(3, roomType.capacity),
    ).toThrow();
  });

  it('preserves the reservation-room-type relationship', async () => {
    const reservation =
      await prisma.reservation.findUniqueOrThrow({
        where: { id: reservationId },
      });

    expect(reservation.roomTypeId).toBe(roomTypeId);
    expect(reservation.guestCount).toBe(2);
  });
});
