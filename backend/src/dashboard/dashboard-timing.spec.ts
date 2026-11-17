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
    await prisma.reservationChargeReceipt.deleteMany();
    await prisma.depositMovement.deleteMany();
    await prisma.depositReturnAuthorization.deleteMany();
    await prisma.reservationCharge.deleteMany();
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

  async function attentionStaff(roleName = 'MANAGER') {
    const actor = await queueStaff();
    const role = await prisma.role.upsert({
      where: { name: roleName }, create: { name: roleName }, update: {},
    });
    await prisma.user.update({ where: { id: actor.id }, data: { roleId: role.id } });
    return { ...actor, role: roleName };
  }

  async function attentionFixture() {
    const actor = await attentionStaff('SUPER_ADMIN');
    const booking = await createBooking('CHECKED_OUT');
    const pending = await prisma.reservationCharge.create({
      data: {
        id: `attention-pending-${booking.id}`, reservationId: booking.id,
        kind: 'DAMAGE', status: 'PENDING', description: 'Synthetic damage proposal',
        amountCentavos: 10000, proposedByUserId: actor.id,
      },
    });
    const correction = await prisma.reservationCharge.create({
      data: {
        id: `attention-correction-${booking.id}`, reservationId: booking.id,
        kind: 'LATE_CHECKOUT', status: 'APPROVED', description: 'Synthetic unfulfilled extension',
        amountCentavos: 5000, proposedByUserId: actor.id,
        reviewedByUserId: actor.id, reviewedAt: new Date(),
      },
    });
    await prisma.reservationChargeReceipt.create({
      data: {
        id: `attention-receipt-${booking.id}`, chargeId: correction.id,
        amountCentavos: 5000, collectedByUserId: actor.id, source: 'CASH', correctionRequired: true,
      },
    });
    await prisma.depositMovement.create({
      data: {
        id: `attention-collection-${booking.id}`, reservationId: booking.id,
        kind: 'COLLECT', amountCentavos: 20000, reason: 'Synthetic deposit collection', recordedByUserId: actor.id,
      },
    });
    const authorization = await prisma.depositReturnAuthorization.create({
      data: {
        id: `attention-return-${booking.id}`, reservationId: booking.id, amountCentavos: 20000,
        reason: 'Synthetic authorized return', approvedByUserId: actor.id,
      },
    });
    return { actor, booking, pending, correction, authorization };
  }

  it('returns role-specific attention queues without recording financial actions', async () => {
    const fixture = await attentionFixture();
    const receptionist = await queueStaff();
    const manager = await attentionStaff('MANAGER');
    const before = {
      receipts: await prisma.reservationChargeReceipt.count(),
      movements: await prisma.depositMovement.count(), audit: await prisma.auditLog.count(),
    };
    const reception = await dashboard.attentionQueues(receptionist);
    expect(reception.chargeApprovals).toBeNull();
    expect(reception.extensionCorrections).toBeNull();
    expect(reception.depositReturns.total).toBe(1);
    expect(reception.canReviewReconciliation).toBe(false);
    const management = await dashboard.attentionQueues(manager);
    expect(management.chargeApprovals?.total).toBe(1);
    expect(management.extensionCorrections).toBeNull();
    expect(management.depositReturns.total).toBe(1);
    const superAdmin = await dashboard.attentionQueues(fixture.actor);
    expect(superAdmin.chargeApprovals?.items[0].id).toBe(fixture.pending.id);
    expect(superAdmin.extensionCorrections?.items[0].id).toBe(fixture.correction.id);
    expect(superAdmin.extensionCorrections?.items[0].label).toBe('Cash correction review');
    expect(superAdmin.canReviewReconciliation).toBe(true);
    expect(await prisma.reservationChargeReceipt.count()).toBe(before.receipts);
    expect(await prisma.depositMovement.count()).toBe(before.movements);
    expect(await prisma.auditLog.count()).toBe(before.audit);
  });

  it('removes reviewed, corrected and returned records from their queues', async () => {
    const fixture = await attentionFixture();
    await prisma.reservationCharge.update({ where: { id: fixture.pending.id }, data: { status: 'APPROVED' } });
    await prisma.reservationChargeReceipt.update({
      where: { chargeId: fixture.correction.id },
      data: { refundedAt: new Date(), refundedByUserId: fixture.actor.id, refundReason: 'Synthetic correction' },
    });
    await prisma.depositMovement.create({
      data: {
        id: `attention-returned-${fixture.booking.id}`, reservationId: fixture.booking.id,
        kind: 'RETURN', amountCentavos: 20000, reason: 'Synthetic actual cash return',
        recordedByUserId: fixture.actor.id, returnAuthorizationId: fixture.authorization.id,
      },
    });
    const result = await dashboard.attentionQueues(fixture.actor);
    expect(result.chargeApprovals?.total).toBe(0);
    expect(result.extensionCorrections?.total).toBe(0);
    expect(result.depositReturns.total).toBe(0);
  });

  it('bounds approval queues to twenty oldest records', async () => {
    const actor = await attentionStaff();
    const booking = await createBooking('CHECKED_IN');
    for (let index = 0; index < 21; index += 1) {
      await prisma.reservationCharge.create({
        data: {
          id: `attention-limit-${index}`, reservationId: booking.id, kind: 'DAMAGE', status: 'PENDING',
          description: 'Synthetic proposal', amountCentavos: 1000, proposedByUserId: actor.id,
          createdAt: new Date(Date.parse('2030-01-01T00:00:00.000Z') + index * 1000),
        },
      });
    }
    const result = await dashboard.attentionQueues(actor);
    expect(result.chargeApprovals?.total).toBe(21);
    expect(result.chargeApprovals?.items).toHaveLength(20);
    expect(result.chargeApprovals?.items[0].id).toBe('attention-limit-0');
    expect(result.chargeApprovals?.items[19].id).toBe('attention-limit-19');
  });

  it('rejects anonymous, guest, stale-role and disabled attention access', async () => {
    const actor = await attentionStaff();
    await expect(dashboard.attentionQueues(undefined)).rejects.toThrow('Sign in');
    await expect(dashboard.attentionQueues({ ...actor, role: 'GUEST' })).rejects.toThrow('Staff permission');
    await expect(dashboard.attentionQueues({ ...actor, role: 'SUPER_ADMIN' })).rejects.toThrow('Current staff permission');
    await prisma.user.update({ where: { id: actor.id }, data: { status: 'DISABLED' } });
    await expect(dashboard.attentionQueues(actor)).rejects.toThrow('Current staff permission');
  });
});
