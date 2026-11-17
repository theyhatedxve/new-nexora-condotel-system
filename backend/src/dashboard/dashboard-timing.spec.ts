import 'reflect-metadata';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PrismaClient, type Prisma, type ReservationStatus,
} from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { DashboardService } from './dashboard.service.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';

describe('dashboard rental timing', () => {
  let directory: string;
  let prisma: PrismaClient;
  let dashboard: DashboardService;
  let guestId: string;
  let roomTypeId: string;
  let sequence = 0;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-dashboard-timing-'));
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: 'file:' + join(directory, 'dashboard.test.db').replaceAll('\\', '/'),
      }),
    });
    await prisma.$connect();
    const migrationDirectory = resolve(process.cwd(), 'prisma/migrations');
    const migrations = readdirSync(migrationDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const migration of migrations) {
      const sql = readFileSync(join(migrationDirectory, migration.name, 'migration.sql'), 'utf8');
      // Matches the existing isolated-test migration procedure.
      const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
    const property = await prisma.property.create({
      data: {
        name: 'Synthetic dashboard property', address: 'Synthetic address',
        city: 'Synthetic city', province: 'Synthetic province',
      },
    });
    const roomType = await prisma.roomType.create({
      data: {
        propertyId: property.id, name: 'Synthetic room type', capacity: 2,
        baseRateCentavos: 450000,
      },
    });
    const guest = await prisma.guest.create({
      data: { firstName: 'Synthetic', lastName: 'Guest' },
    });
    roomTypeId = roomType.id;
    guestId = guest.id;
    dashboard = new DashboardService(prisma as unknown as PrismaService);
  }, 60000);

  beforeEach(async () => {
    vi.useRealTimers();
    await prisma.reservation.deleteMany();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-02T04:00:00.000Z'));
  });

  afterAll(async () => {
    vi.useRealTimers();
    try {
      if (prisma) await prisma.$disconnect();
    } finally {
      if (directory) rmSync(directory, { recursive: true, force: true });
    }
  });

  function createBooking(
    status: ReservationStatus,
    patch: Partial<Prisma.ReservationUncheckedCreateInput> = {},
  ) {
    sequence += 1;
    return prisma.reservation.create({
      data: {
        reservationNumber: `DASHBOARD-TIMING-${sequence}`,
        guestId, roomTypeId, status, guestCount: 2,
        nightlyRateCentavos: 450000, totalAmountCentavos: 450000,
        checkInDate: new Date('2030-01-01T00:00:00.000Z'),
        checkOutDate: new Date('2030-01-02T00:00:00.000Z'),
        rentalType: 'NIGHTLY', rentalUnits: 1, rentalRateCentavos: 450000,
        includedOccupancy: 2, extraPersonFeeCentavos: 0,
        accommodationCentavos: 450000, extraPersonTotalCentavos: 0,
        scheduledArrivalAt: new Date('2030-01-01T07:00:00.000Z'),
        scheduledDepartureAt: new Date('2030-01-02T07:00:00.000Z'),
        inventoryStartAt: new Date('2030-01-01T07:00:00.000Z'),
        inventoryEndAt: new Date('2030-01-02T07:00:00.000Z'),
        ...patch,
      },
    });
  }

  it.each([
    ['2030-01-01T15:59:59.999Z', 0],
    ['2030-01-01T16:00:00.000Z', 1],
    ['2030-01-02T15:59:59.999Z', 1],
    ['2030-01-02T16:00:00.000Z', 0],
  ])('counts rental arrivals at Philippine-day boundary %s', async (timestamp, expected) => {
    const start = new Date(timestamp);
    const end = new Date(start.getTime() + 86400000);
    await createBooking('CONFIRMED', {
      scheduledArrivalAt: start, scheduledDepartureAt: end,
      inventoryStartAt: start, inventoryEndAt: end,
    });
    const summary = await dashboard.summary();
    expect(summary.date).toBe('2030-01-02');
    expect(summary.timezone).toBe('Asia/Manila');
    expect(summary.expectedArrivals).toBe(expected);
    expect(summary.expectedDepartures).toBe(0);
  });

  it.each([
    ['2030-01-01T15:59:59.999Z', 0],
    ['2030-01-01T16:00:00.000Z', 1],
    ['2030-01-02T15:59:59.999Z', 1],
    ['2030-01-02T16:00:00.000Z', 0],
  ])('counts current rental departures at Philippine-day boundary %s', async (timestamp, expected) => {
    await createBooking('CHECKED_IN', {
      actualArrivalAt: new Date('2030-01-01T07:00:00.000Z'),
      inventoryEndAt: new Date(timestamp),
    });
    const summary = await dashboard.summary();
    expect(summary.expectedDepartures).toBe(expected);
    expect(summary.expectedArrivals).toBe(0);
  });

  it('moves a departure count when the effective departure changes day', async () => {
    const booking = await createBooking('CHECKED_IN', {
      actualArrivalAt: new Date('2030-01-01T07:00:00.000Z'),
    });
    expect((await dashboard.summary()).expectedDepartures).toBe(1);
    await prisma.reservation.update({
      where: { id: booking.id },
      data: { inventoryEndAt: new Date('2030-01-02T17:00:00.000Z') },
    });
    expect((await dashboard.summary()).expectedDepartures).toBe(0);
    const stored = await prisma.reservation.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stored.checkOutDate.toISOString()).toBe('2030-01-02T00:00:00.000Z');
    expect(stored.scheduledDepartureAt?.toISOString()).toBe('2030-01-02T07:00:00.000Z');
    expect(stored.totalAmountCentavos).toBe(450000);
  });

  it('preserves historical calendar-date counts', async () => {
    const legacy = {
      rentalType: null, rentalUnits: null, rentalRateCentavos: null,
      includedOccupancy: null, extraPersonFeeCentavos: null,
      accommodationCentavos: null, extraPersonTotalCentavos: null,
      scheduledArrivalAt: null, scheduledDepartureAt: null,
      inventoryStartAt: null, inventoryEndAt: null,
    };
    await createBooking('CONFIRMED', {
      ...legacy,
      checkInDate: new Date('2030-01-02T00:00:00.000Z'),
      checkOutDate: new Date('2030-01-03T00:00:00.000Z'),
    });
    await createBooking('CHECKED_IN', legacy);
    const summary = await dashboard.summary();
    expect(summary.expectedArrivals).toBe(1);
    expect(summary.expectedDepartures).toBe(1);
  });

  it('excludes ineligible states and incomplete rental timing', async () => {
    const arrival = new Date('2030-01-02T07:00:00.000Z');
    const departure = new Date('2030-01-03T07:00:00.000Z');
    for (const status of ['PENDING', 'CANCELLED', 'EXPIRED', 'CHECKED_OUT'] as const) {
      await createBooking(status, {
        scheduledArrivalAt: arrival, scheduledDepartureAt: departure,
        inventoryStartAt: arrival, inventoryEndAt: departure,
      });
    }
    await createBooking('CONFIRMED', {
      scheduledArrivalAt: null,
      checkInDate: new Date('2030-01-02T00:00:00.000Z'),
    });
    await createBooking('CHECKED_IN', { inventoryEndAt: null });
    const summary = await dashboard.summary();
    expect(summary.expectedArrivals).toBe(0);
    expect(summary.expectedDepartures).toBe(0);
  });

  async function queueStaff(): Promise<AuthenticatedUser> {
    sequence += 1;
    const role = await prisma.role.upsert({
      where: { name: 'RECEPTIONIST' }, create: { name: 'RECEPTIONIST' }, update: {},
    });
    const staff = await prisma.user.create({
      data: {
        roleId: role.id, name: 'Synthetic receptionist',
        email: `queue-staff-${sequence}@example.test`,
        passwordHash: 'synthetic-unused-password-hash', status: 'ACTIVE',
      },
    });
    return { id: staff.id, email: staff.email, role: 'RECEPTIONIST' };
  }

  it('lists initial contact and awaiting-confirmation requests without changing them', async () => {
    const actor = await queueStaff();
    const initial = await createBooking('PENDING', {
      bookingPolicyVersion: 'guest-booking-v2', paymentPreference: 'PAY_AT_PROPERTY',
      expectedArrivalAt: new Date('2030-01-02T07:00:00.000Z'),
      holdExpiresAt: new Date('2030-01-02T07:30:00.000Z'),
      createdAt: new Date('2030-01-01T01:00:00.000Z'),
    });
    const contacted = await createBooking('PENDING', {
      bookingPolicyVersion: 'guest-booking-v2', paymentPreference: 'PAY_AT_PROPERTY',
      firstContactedAt: new Date('2030-01-01T03:00:00.000Z'),
      responseDeadlineAt: new Date('2030-01-02T03:00:00.000Z'),
      expectedArrivalAt: new Date('2030-01-02T07:00:00.000Z'),
      holdExpiresAt: new Date('2030-01-02T03:00:00.000Z'),
      createdAt: new Date('2030-01-01T02:00:00.000Z'),
    });
    const auditCount = await prisma.auditLog.count();
    const result = await dashboard.contactQueue(actor);
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual([initial.id, contacted.id]);
    expect(result.items[0].attention).toBe('INITIAL_CONTACT_NEEDED');
    expect(result.items[0].deadlineReached).toBe(false);
    expect(result.items[1].attention).toBe('AWAITING_CONFIRMATION');
    expect(result.items[1].deadlineReached).toBe(true);
    expect(await prisma.reservation.findUniqueOrThrow({ where: { id: initial.id } })).toEqual(initial);
    expect(await prisma.reservation.findUniqueOrThrow({ where: { id: contacted.id } })).toEqual(contacted);
    expect(await prisma.auditLog.count()).toBe(auditCount);
  });

  it('excludes unsupported requests and closed bookings', async () => {
    const actor = await queueStaff();
    for (const status of ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED'] as const) {
      await createBooking(status, {
        bookingPolicyVersion: 'guest-booking-v2', paymentPreference: 'PAY_AT_PROPERTY',
      });
    }
    await createBooking('PENDING', { bookingPolicyVersion: 'guest-booking-v2', paymentPreference: 'PAYMONGO' });
    await createBooking('PENDING', { bookingPolicyVersion: null, paymentPreference: 'PAY_AT_PROPERTY' });
    const result = await dashboard.contactQueue(actor);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('bounds the queue and preserves missing deadlines for staff review', async () => {
    const actor = await queueStaff();
    for (let index = 0; index < 21; index += 1) {
      await createBooking('PENDING', {
        bookingPolicyVersion: 'guest-booking-v2', paymentPreference: 'PAY_AT_PROPERTY',
        holdExpiresAt: null,
        createdAt: new Date(Date.parse('2030-01-01T00:00:00.000Z') + index * 1000),
      });
    }
    const result = await dashboard.contactQueue(actor);
    expect(result.total).toBe(21);
    expect(result.limit).toBe(20);
    expect(result.items).toHaveLength(20);
    expect(result.items.every((item) => item.deadlineAt === null && !item.deadlineReached)).toBe(true);
  });

  it('rejects anonymous, guest, stale-role and disabled identities', async () => {
    const actor = await queueStaff();
    expect(() => dashboard.contactQueue(undefined)).toThrow('Sign in');
    expect(() => dashboard.contactQueue({ ...actor, role: 'GUEST' })).toThrow('Staff permission');
    await expect(dashboard.contactQueue({ ...actor, role: 'MANAGER' })).rejects.toThrow('Current staff permission');
    await prisma.user.update({ where: { id: actor.id }, data: { status: 'DISABLED' } });
    await expect(dashboard.contactQueue(actor)).rejects.toThrow('Current staff permission');
  });
});
