
import { randomUUID } from 'node:crypto';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type { PrismaClient } from '../../generated/prisma/client.js';
import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../../../test/helpers/isolated-database.js';

import { OwnershipService } from './ownership.service.js';
import type { AuthenticatedUser } from './ownership.service.js';

import { USER_ROLES } from '../decorators/roles.decorator.js';



let prisma: PrismaClient;
let database: IsolatedTestDatabase | undefined;
let ownership: OwnershipService;

let roomTypeId: string;
let guestAId: string;
let guestBId: string;
let reservationAId: string;
let reservationBId: string;

let guestA: AuthenticatedUser;
let guestB: AuthenticatedUser;


describe('OwnershipService — Phase 3 Step 6', () => {
  beforeAll(async () => {
    database = await createIsolatedTestDatabase();
    prisma = database.prisma;

    ownership = new OwnershipService(prisma as never);

    const suffix = randomUUID();

    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const userA = await prisma.user.create({
      data: {
        name: 'Step 6 Guest A',
        email: `step6-a-${suffix}@example.invalid`,
        passwordHash: 'isolated-test-placeholder',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });


    const userB = await prisma.user.create({
      data: {
        name: 'Step 6 Guest B',
        email: `step6-b-${suffix}@example.invalid`,
        passwordHash: 'isolated-test-placeholder',
        roleId: role.id,
        status: 'ACTIVE',
      },
    });


    guestA = {
      id: userA.id,
      email: userA.email,
      role: 'GUEST',
    };

    guestB = {
      id: userB.id,
      email: userB.email,
      role: 'GUEST',
    };

    const firstGuest = await prisma.guest.create({
      data: {
        userId: userA.id,
        firstName: 'Guest',
        lastName: 'Alpha',
      },
    });

    guestAId = firstGuest.id;

    const secondGuest = await prisma.guest.create({
      data: {
        userId: userB.id,
        firstName: 'Guest',
        lastName: 'Beta',
      },
    });

    guestBId = secondGuest.id;

    const property = await prisma.property.create({
      data: {
        name: `Step 6 Test Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });


    const roomType = await prisma.roomType.create({
      data: {
        propertyId: property.id,
        name: 'Step 6 Standard Room',
        capacity: 2,
        baseRateCentavos: 200000,
      },
    });

    roomTypeId = roomType.id;

    const reservationA = await prisma.reservation.create({
      data: {
        reservationNumber: `S6A-${suffix}`,
        guestId: guestAId,
        roomTypeId,
        checkInDate: new Date('2027-03-01T00:00:00.000Z'),
        checkOutDate: new Date('2027-03-03T00:00:00.000Z'),
        guestCount: 1,
        nightlyRateCentavos: 200000,
        totalAmountCentavos: 400000,
        status: 'CONFIRMED',
      },
    });

    reservationAId = reservationA.id;

    const reservationB = await prisma.reservation.create({
      data: {
        reservationNumber: `S6B-${suffix}`,
        guestId: guestBId,
        roomTypeId,
        checkInDate: new Date('2027-03-05T00:00:00.000Z'),
        checkOutDate: new Date('2027-03-07T00:00:00.000Z'),
        guestCount: 1,
        nightlyRateCentavos: 200000,
        totalAmountCentavos: 400000,
        status: 'CONFIRMED',
      },
    });

    reservationBId = reservationB.id;
  }, 60_000);

  afterAll(async () => {
    await database?.dispose();
  });

  it('allows a guest to access their own profile', async () => {
    await expect(
      ownership.assertGuestAccess(guestA, guestAId),
    ).resolves.toBeUndefined();
  });

  it('denies access to another guest profile', async () => {
    await expect(
      ownership.assertGuestAccess(guestA, guestBId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows a guest to access their own reservation', async () => {
    await expect(
      ownership.assertReservationAccess(
        guestA,
        reservationAId,
      ),
    ).resolves.toBeUndefined();
  });

  it('denies access to another guest reservation', async () => {
    await expect(
      ownership.assertReservationAccess(
        guestA,
        reservationBId,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enforces the same ownership rules for Guest B', async () => {
    await expect(
      ownership.assertReservationAccess(
        guestB,
        reservationBId,
      ),
    ).resolves.toBeUndefined();

    await expect(
      ownership.assertReservationAccess(
        guestB,
        reservationAId,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns NotFound for nonexistent records', async () => {
    await expect(
      ownership.assertGuestAccess(
        guestA,
        'nonexistent-guest',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      ownership.assertReservationAccess(
        guestA,
        'nonexistent-reservation',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects missing authenticated identity', async () => {
    await expect(
      ownership.assertGuestAccess(null, guestAId),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      ownership.assertReservationAccess(
        undefined,
        reservationAId,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not give ADMIN automatic access', async () => {
    const admin = {
      id: 'staff-admin',
      email: 'admin@example.invalid',
      role: 'ADMIN',
    };

    await expect(
      ownership.assertGuestAccess(admin, guestAId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows explicitly authorized staff access', async () => {
    const receptionist = {
      id: 'staff-receptionist',
      email: 'staff@example.invalid',
      role: 'RECEPTIONIST',
    };

    await expect(
      ownership.assertReservationAccess(
        receptionist,
        reservationAId,
        [USER_ROLES.RECEPTIONIST],
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects staff roles not explicitly authorized', async () => {
    const receptionist = {
      id: 'staff-receptionist',
      email: 'staff@example.invalid',
      role: 'RECEPTIONIST',
    };

    await expect(
      ownership.assertReservationAccess(
        receptionist,
        reservationAId,
        [USER_ROLES.MANAGER],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
