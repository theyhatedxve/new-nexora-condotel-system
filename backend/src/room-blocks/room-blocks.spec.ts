
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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import { RoomBlocksService } from './room-blocks.service.js';
import { RoomStatusService } from '../rooms/room-status.service.js';

const testDb = resolve(process.cwd(), 'phase4.step6.test.db');
const devDb = resolve(process.cwd(), 'dev.db');
const suffix = randomUUID();

let prisma: PrismaClient;
let blocks: RoomBlocksService;
let statuses: RoomStatusService;

let propertyId = '';
let roomId = '';
let roomTypeId = '';
let blockId = '';
let guestId = '';
let userId = '';
let reservationId = '';
let assignmentId = '';

function phDate(daysFromNow: number): string {
  const todayText = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const date = new Date(`${todayText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysFromNow);

  return date.toISOString().slice(0, 10);
}

function verifyIsolation() {
  if (process.cwd().split(/[\\/]/).at(-1) !== 'backend') {
    throw new Error('Run tests from the backend directory.');
  }

  if (!existsSync(testDb)) {
    throw new Error('Step 6 test database does not exist.');
  }

  if (
    existsSync(devDb) &&
    realpathSync(devDb) === realpathSync(testDb)
  ) {
    throw new Error('Refusing to use development database.');
  }
}

describe('Phase 4 Step 6 — Room Operations', () => {
  beforeAll(async () => {
    verifyIsolation();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./phase4.step6.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    const property = await prisma.property.create({
      data: {
        name: `Step 6 Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });


    it('does not allow editing a canceled block', async () => {
    await expect(
        blocks.update(roomId, blockId, {
        reason: 'Attempt to reactivate canceled block',
        }),
    ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not commit two simultaneous overlapping blocks', async () => {
    const startDate = phDate(40);
    const endDate = phDate(43);

    const requests = await Promise.allSettled([
        blocks.create(roomId, {
        startDate,
        endDate,
        reason: 'Concurrent repair A',
        }),
        blocks.create(roomId, {
        startDate,
        endDate,
        reason: 'Concurrent repair B',
        }),
    ]);

    const successful = requests.filter(
        (result) => result.status === 'fulfilled',
    );

    expect(successful).toHaveLength(1);

    const stored = await prisma.roomBlock.findMany({
        where: {
        roomId,
        canceledAt: null,
        startDate: new Date(`${startDate}T00:00:00.000Z`),
        endDate: new Date(`${endDate}T00:00:00.000Z`),
        },
    });

    expect(stored).toHaveLength(1);
    });


    propertyId = property.id;

    const roomType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Step 6 Deluxe ${suffix}`,
        capacity: 2,
        baseRateCentavos: 250000,
      },
    });

    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: {
        roomTypeId,
        roomNumber: `P4S6-${suffix}`,
        status: 'READY',
        isActive: true,
      },
    });

    roomId = room.id;

    blocks = new RoomBlocksService(prisma as never);
    statuses = new RoomStatusService(prisma as never);
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      if (assignmentId) {
        await prisma.roomAssignment.deleteMany({
          where: { id: assignmentId },
        });
      }

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

      if (roomId) {
        await prisma.roomBlock.deleteMany({
          where: { roomId },
        });

        await prisma.room.deleteMany({
          where: { id: roomId },
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

  it('permits routine housekeeping transitions', async () => {
    const cleaning = await statuses.update(
      roomId,
      'CLEANING',
      'RECEPTIONIST',
    );

    expect(cleaning.status).toBe('CLEANING');

    const ready = await statuses.update(
      roomId,
      'READY',
      'RECEPTIONIST',
    );

    expect(ready.status).toBe('READY');
  });

  it('rejects maintenance changes by a receptionist', async () => {
    await expect(
      statuses.update(roomId, 'MAINTENANCE', 'RECEPTIONIST'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows manager-controlled maintenance transitions', async () => {
    const maintenance = await statuses.update(
      roomId,
      'MAINTENANCE',
      'MANAGER',
    );

    expect(maintenance.status).toBe('MAINTENANCE');

    const ready = await statuses.update(
      roomId,
      'READY',
      'ADMIN',
    );

    expect(ready.status).toBe('READY');
  });

  it('rejects no-op and prohibited transitions', async () => {
    await expect(
      statuses.update(roomId, 'READY', 'ADMIN'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a valid dated block', async () => {
    const created = await blocks.create(roomId, {
      startDate: phDate(10),
      endDate: phDate(13),
      reason: 'Air conditioner service',
    });

    blockId = created.id;

    expect(created.canceledAt).toBeNull();
    expect(created.reason).toBe('Air conditioner service');
  });

  it('rejects overlapping active blocks', async () => {
    await expect(
      blocks.create(roomId, {
        startDate: phDate(12),
        endDate: phDate(15),
        reason: 'Overlapping repair',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows adjacent nonoverlapping blocks', async () => {
    const adjacent = await blocks.create(roomId, {
      startDate: phDate(13),
      endDate: phDate(15),
      reason: 'Follow-up cleaning',
    });

    expect(adjacent.id).toBeTruthy();
  });

  it('rejects invalid date ranges', async () => {
    await expect(
      blocks.create(roomId, {
        startDate: phDate(20),
        endDate: phDate(20),
        reason: 'Invalid dates',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a block without conflicting with itself', async () => {
    const updated = await blocks.update(
      roomId,
      blockId,
      { reason: 'Revised maintenance schedule' },
    );

    expect(updated.reason).toBe('Revised maintenance schedule');
  });

  it('cancels a block without deleting its record', async () => {
    const canceled = await blocks.cancel(roomId, blockId);

    expect(canceled.canceledAt).toBeInstanceOf(Date);

    const stored = await prisma.roomBlock.findUnique({
      where: { id: blockId },
    });

    expect(stored).not.toBeNull();
    expect(stored?.canceledAt).not.toBeNull();
  });

  it('allows dates previously blocked by a canceled block', async () => {
    const replacement = await blocks.create(roomId, {
      startDate: phDate(10),
      endDate: phDate(13),
      reason: 'Replacement maintenance',
    });

    expect(replacement.id).toBeTruthy();
  });

  it('rejects nonexistent rooms', async () => {
    await expect(
      blocks.list('missing-room'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects block creation overlapping an assigned reservation', async () => {
    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Step 6 Test Guest',
        email: `step6-${suffix}@example.invalid`,
        passwordHash: 'test-placeholder',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });

    userId = user.id;

    const guest = await prisma.guest.create({
      data: {
        userId,
        firstName: 'Step',
        lastName: 'Six',
      },
    });

    guestId = guest.id;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber: `STEP6-${suffix}`,
        guestId,
        roomTypeId,
        guestCount: 2,
        checkInDate: new Date(`${phDate(25)}T00:00:00.000Z`),
        checkOutDate: new Date(`${phDate(28)}T00:00:00.000Z`),
        nightlyRateCentavos: 250000,
        totalAmountCentavos: 750000,
        status: 'CONFIRMED',
      },
    });

    reservationId = reservation.id;

    const assignment = await prisma.roomAssignment.create({
      data: {
        reservationId,
        roomId,
      },
    });

    assignmentId = assignment.id;

    await expect(
      blocks.create(roomId, {
        startDate: phDate(26),
        endDate: phDate(29),
        reason: 'Conflicting maintenance',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('protects an assigned checked-in guest', async () => {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CHECKED_IN' },
    });

    await expect(
      statuses.update(roomId, 'MAINTENANCE', 'ADMIN'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows future blocks after an assignment is released', async () => {
    await prisma.roomAssignment.update({
      where: { id: assignmentId },
      data: { releasedAt: new Date() },
    });

    const created = await blocks.create(roomId, {
      startDate: phDate(26),
      endDate: phDate(29),
      reason: 'Maintenance after reassignment',
    });

    expect(created.id).toBeTruthy();
  });
});
