
import { randomUUID } from 'node:crypto';

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

import type { PrismaClient } from '../generated/prisma/client.js';

import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../../test/helpers/isolated-database.js';

import { RoomsService } from './rooms.service.js';

const suffix = randomUUID();

let prisma: PrismaClient;
let isolatedDatabase: IsolatedTestDatabase | undefined;
let service: RoomsService;

let propertyId = '';
let roomTypeId = '';
let alternateTypeId = '';
let roomId = '';
let userId = '';
let guestId = '';
let reservationId = '';
let assignmentId = '';

function futureDate(days: number): Date {
  const result = new Date();
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

describe('Phase 4 Step 2 — RoomsService', () => {
  beforeAll(async () => {
    isolatedDatabase = await createIsolatedTestDatabase();
    prisma = isolatedDatabase.prisma;

    const property = await prisma.property.create({
      data: {
        name: `Step 2 Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    propertyId = property.id;

    const roomType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Standard ${suffix}`,
        capacity: 2,
        baseRateCentavos: 200000,
      },
    });

    roomTypeId = roomType.id;

    const alternate = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Deluxe ${suffix}`,
        capacity: 4,
        baseRateCentavos: 350000,
      },
    });

    alternateTypeId = alternate.id;

    service = new RoomsService(prisma as never);
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

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

      if (propertyId) {
        await prisma.room.deleteMany({
          where: {
            roomType: { propertyId },
          },
        });

        await prisma.roomType.deleteMany({
          where: { propertyId },
        });

        await prisma.property.delete({
          where: { id: propertyId },
        });
      }
    } finally {
      await isolatedDatabase?.dispose();
    }
  });

  it('creates a physical room with READY status', async () => {
    const room = await service.create({
      roomNumber: `S2-${suffix}`,
      floor: '2',
      roomTypeId,
    });

    roomId = room.id;

    expect(room.roomTypeId).toBe(roomTypeId);
    expect(room.status).toBe('READY');
    expect(room.isActive).toBe(true);
    expect(room.floor).toBe('2');
  });

  it('lists physical rooms', async () => {
    const rooms = await service.findAll();

    expect(
      rooms.some((room) => room.id === roomId),
    ).toBe(true);
  });

  it('returns a physical room by ID', async () => {
    const room = await service.findOne(roomId);

    expect(room.id).toBe(roomId);
    expect(room.roomType.name).toContain('Standard');
  });

  it('rejects duplicate room numbers', async () => {
    await expect(
      service.create({
        roomNumber: `S2-${suffix}`,
        roomTypeId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid room types', async () => {
    await expect(
      service.create({
        roomNumber: `UNKNOWN-${suffix}`,
        roomTypeId: 'nonexistent-room-type',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects blank room numbers', async () => {
    await expect(
      service.create({
        roomNumber: '   ',
        roomTypeId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty updates and unknown room IDs', async () => {
    await expect(
      service.update(roomId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.findOne('nonexistent-room'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates permitted room information', async () => {
    const updated = await service.update(roomId, {
      floor: '3',
    });

    expect(updated.floor).toBe('3');
  });

  it('allows reassignment before protected bookings exist', async () => {
    const updated = await service.update(roomId, {
      roomTypeId: alternateTypeId,
    });

    expect(updated.roomTypeId).toBe(alternateTypeId);
  });

  it('protects assigned reservations from room changes', async () => {
    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Phase 4 Guest',
        email: `p4s2-${suffix}@example.invalid`,
        passwordHash: 'isolated-test-placeholder',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });

    userId = user.id;

    const guest = await prisma.guest.create({
      data: {
        userId,
        firstName: 'Phase',
        lastName: 'Four',
      },
    });

    guestId = guest.id;

    const reservation = await prisma.reservation.create({
      data: {
        reservationNumber: `P4S2-${suffix}`,
        guestId,
        roomTypeId: alternateTypeId,
        guestCount: 2,
        checkInDate: futureDate(7),
        checkOutDate: futureDate(10),
        nightlyRateCentavos: 350000,
        totalAmountCentavos: 1050000,
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
      service.update(roomId, {
        roomTypeId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.update(roomId, {
        isActive: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves the reservation assignment', async () => {
    const assignment =
      await prisma.roomAssignment.findUnique({
        where: { id: assignmentId },
      });

    expect(assignment?.roomId).toBe(roomId);
    expect(assignment?.releasedAt).toBeNull();
  });

  it(
      'protects the booking inventory after an assignment is released',
      async () => {
        await prisma.roomAssignment.update({
          where: {
            id: assignmentId,
          },
          data: {
            releasedAt: new Date(),
          },
        });

        await expect(
          service.update(roomId, {
            roomTypeId,
          }),
        ).rejects.toBeInstanceOf(ConflictException);

        const stored = await prisma.room.findUniqueOrThrow({
          where: {
            id: roomId,
          },
        });

        expect(stored.roomTypeId).toBe(alternateTypeId);
      },
    );
});
