
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { RoomRateCapacityService } from '../validation/room-rate-capacity.service.js';
import { InventorySafetyService } from './inventory-safety.service.js';

const testDb = resolve(process.cwd(), 'phase4.step7.test.db');
const devDb = resolve(process.cwd(), 'dev.db');
const suffix = randomUUID();

let prisma: PrismaClient;
let inventory: InventorySafetyService;

let propertyId: string;
let roomTypeId: string;
let roomId: string;
let guestId: string;
let userId: string;

function phDate(daysFromToday: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value ?? '';

  const date = new Date(
    `${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`,
  );

  date.setUTCDate(date.getUTCDate() + daysFromToday);

  return date.toISOString().slice(0, 10);
}

function asDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function verifyTestDatabase(): void {
  if (process.cwd().split(/[\\/]/).at(-1) !== 'backend') {
    throw new Error('Run the tests from backend/.');
  }

  if (!existsSync(testDb)) {
    throw new Error(
      'Missing phase4.step7.test.db. Apply migrations first.',
    );
  }

  if (
    existsSync(devDb) &&
    realpathSync(testDb) === realpathSync(devDb)
  ) {
    throw new Error('Refusing to use backend/dev.db.');
  }
}

function request(
  overrides: Partial<Parameters<InventorySafetyService['assertEligible']>[0]> = {},
) {
  return {
    roomId,
    roomTypeId,
    guestCount: 2,
    checkInDate: phDate(10),
    checkOutDate: phDate(13),
    mode: 'FUTURE' as const,
    ...overrides,
  };
}

async function createReservation(
  startOffset: number,
  endOffset: number,
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' = 'CONFIRMED',
) {
  return prisma.reservation.create({
    data: {
      reservationNumber: `INV-${randomUUID()}`,
      guestId,
      roomTypeId,
      guestCount: 2,
      checkInDate: asDate(phDate(startOffset)),
      checkOutDate: asDate(phDate(endOffset)),
      nightlyRateCentavos: 250000,
      totalAmountCentavos: 750000,
      status,
    },
  });
}

async function assignReservation(
  reservationId: string,
) {
  return prisma.roomAssignment.create({
    data: {
      reservationId,
      roomId,
    },
  });
}

/**
 * Test-only assignment writer.
 *
 * This function must NOT be used as a production
 * room-assignment API or exported into AppModule.
 */
async function testOnlyAssignInTransaction(
  reservationId: string,
  startOffset: number,
  endOffset: number,
) {
  return prisma.$transaction(async (tx) => {
    await inventory.assertEligibleInTx(tx, {
      ...request({
        checkInDate: phDate(startOffset),
        checkOutDate: phDate(endOffset),
      }),
    });

    return tx.roomAssignment.create({
      data: {
        reservationId,
        roomId,
      },
    });
  });
}

describe('Phase 4 Step 7 — Inventory Safety', () => {
  beforeAll(async () => {
    verifyTestDatabase();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./phase4.step7.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    const property = await prisma.property.create({
      data: {
        name: `Inventory Test Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    propertyId = property.id;

    const roomType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Inventory Deluxe ${suffix}`,
        capacity: 2,
        baseRateCentavos: 250000,
      },
    });

    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomTypeId,
        roomNumber: `INV-${suffix}`,
        status: 'READY',
        isActive: true,
      },
    });

    roomId = room.id;

    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Inventory Test Guest',
        email: `inventory-${suffix}@example.invalid`,
        passwordHash: 'test-only-placeholder',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });

    userId = user.id;

    const guest = await prisma.guest.create({
      data: {
        userId,
        firstName: 'Inventory',
        lastName: 'Tester',
      },
    });

    guestId = guest.id;

    inventory = new InventorySafetyService(
      prisma as never,
      new RoomRateCapacityService(),
    );
  });

  beforeEach(async () => {
    // Reset only test-owned records, never dev.db.
    await prisma.roomAssignment.deleteMany({
      where: { roomId },
    });

    await prisma.reservation.deleteMany({
      where: { guestId },
    });

    await prisma.roomBlock.deleteMany({
      where: { roomId },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: {
        isActive: true,
        status: 'READY',
      },
    });

    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: {
        isActive: true,
        capacity: 2,
        baseRateCentavos: 250000,
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      if (roomId) {
        await prisma.roomAssignment.deleteMany({
          where: { roomId },
        });
        await prisma.roomBlock.deleteMany({
          where: { roomId },
        });
      }

      if (guestId) {
        await prisma.reservation.deleteMany({
          where: { guestId },
        });
      }

      if (roomId) {
        await prisma.room.deleteMany({
          where: { id: roomId },
        });
      }

      if (roomTypeId) {
        await prisma.roomType.deleteMany({
          where: { id: roomTypeId },
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

      if (propertyId) {
        await prisma.property.deleteMany({
          where: { id: propertyId },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('accepts an active READY room', async () => {
    const result = await inventory.assertEligible(request());

    expect(result.eligible).toBe(true);
    expect(result.roomId).toBe(roomId);
  });

  it('rejects an inactive physical room', async () => {
    await prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });

    await expect(
      inventory.assertEligible(request()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an inactive room type', async () => {
    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { isActive: false },
    });

    await expect(
      inventory.assertEligible(request()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a mismatched room type', async () => {
    await expect(
      inventory.assertEligible(
        request({ roomTypeId: 'wrong-room-type' }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects guest count exceeding capacity', async () => {
    await expect(
      inventory.assertEligible(request({ guestCount: 3 })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid date ranges', async () => {
    await expect(
      inventory.assertEligible(
        request({
          checkInDate: phDate(12),
          checkOutDate: phDate(12),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects nonexistent physical rooms', async () => {
    await expect(
      inventory.assertEligible(
        request({ roomId: 'missing-room' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  for (const status of [
    'MAINTENANCE',
    'OUT_OF_SERVICE',
  ] as const) {
    it(`rejects ${status} for future use`, async () => {
      await prisma.room.update({
        where: { id: roomId },
        data: { status },
      });

      await expect(
        inventory.assertEligible(request()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  }

  for (const status of [
    'CLEANING',
    'OCCUPIED',
  ] as const) {
    it(`permits future eligibility for ${status}`, async () => {
      await prisma.room.update({
        where: { id: roomId },
        data: { status },
      });

      const result = await inventory.assertEligible(request());

      expect(result.eligible).toBe(true);
    });

    it(`rejects immediate use of ${status}`, async () => {
      await prisma.room.update({
        where: { id: roomId },
        data: { status },
      });

      await expect(
        inventory.assertEligible(
          request({
            mode: 'IMMEDIATE',
            checkInDate: phDate(0),
            checkOutDate: phDate(2),
          }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  }

  it('allows a READY room for immediate use', async () => {
    const result = await inventory.assertEligible(
      request({
        mode: 'IMMEDIATE',
        checkInDate: phDate(0),
        checkOutDate: phDate(2),
      }),
    );

    expect(result.eligible).toBe(true);
  });

  it('rejects overlapping active room blocks', async () => {
    await prisma.roomBlock.create({
      data: {
        roomId,
        startDate: asDate(phDate(11)),
        endDate: asDate(phDate(14)),
        reason: 'Maintenance',
      },
    });

    await expect(
      inventory.assertEligible(request()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ignores canceled room blocks', async () => {
    await prisma.roomBlock.create({
      data: {
        roomId,
        startDate: asDate(phDate(11)),
        endDate: asDate(phDate(14)),
        reason: 'Canceled maintenance',
        canceledAt: new Date(),
      },
    });

    const result = await inventory.assertEligible(request());

    expect(result.eligible).toBe(true);
  });

  it('allows adjacent room blocks', async () => {
    await prisma.roomBlock.create({
      data: {
        roomId,
        startDate: asDate(phDate(13)),
        endDate: asDate(phDate(16)),
        reason: 'Future maintenance',
      },
    });

    const result = await inventory.assertEligible(request());

    expect(result.eligible).toBe(true);
  });

  for (const status of [
    'PENDING',
    'CONFIRMED',
    'CHECKED_IN',
  ] as const) {
    it(`rejects an overlapping ${status} assignment`, async () => {
      const reservation = await createReservation(
        11,
        14,
        status,
      );

      await assignReservation(reservation.id);

      await expect(
        inventory.assertEligible(request()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  }

  it('ignores released room assignments', async () => {
    const reservation = await createReservation(11, 14);
    const assignment = await assignReservation(reservation.id);

    await prisma.roomAssignment.update({
      where: { id: assignment.id },
      data: { releasedAt: new Date() },
    });

    const result = await inventory.assertEligible(request());

    expect(result.eligible).toBe(true);
  });

  it('allows adjacent reservation dates', async () => {
    const reservation = await createReservation(13, 16);
    await assignReservation(reservation.id);

    const result = await inventory.assertEligible(request());

    expect(result.eligible).toBe(true);
  });

  it('preserves reservation financial snapshots', async () => {
    const reservation = await createReservation(20, 23);

    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { baseRateCentavos: 300000 },
    });

    const stored = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });

    expect(stored.nightlyRateCentavos).toBe(250000);
    expect(stored.totalAmountCentavos).toBe(750000);
  });

  it('does not commit two conflicting concurrent assignments', async () => {
    const first = await createReservation(40, 43);
    const second = await createReservation(40, 43);

    const attempts = await Promise.allSettled([
      testOnlyAssignInTransaction(first.id, 40, 43),
      testOnlyAssignInTransaction(second.id, 40, 43),
    ]);

    const successes = attempts.filter(
      (result) => result.status === 'fulfilled',
    );

    // One may fail due to a conflict or SQLite write lock.
    // Neither outcome permits two overlapping assignments.
    expect(successes.length).toBeLessThanOrEqual(1);

    const assignments = await prisma.roomAssignment.findMany({
      where: {
        roomId,
        reservationId: {
          in: [first.id, second.id],
        },
        releasedAt: null,
      },
    });

    expect(assignments.length).toBeLessThanOrEqual(1);
  });
});
