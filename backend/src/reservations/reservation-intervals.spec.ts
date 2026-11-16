import 'reflect-metadata';
import { createHmac, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { ConflictException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { InventorySafetyService } from '../common/inventory/inventory-safety.service.js';
import { calendarInstant, reservationWindow } from '../common/inventory/reservation-window.js';
import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';
import { AvailabilityService } from '../availability/availability.service.js';
import { ReservationValidationService } from './reservation-validation.service.js';
import { ReservationAcquisitionService } from './reservation-acquisition.service.js';
import { ReservationStayService } from './reservation-stay.service.js';
import { GuestBookingService } from './guest-booking.service.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import { assertCheckoutBookingEligible } from '../payments/pending-online-booking.js';
import { actualRentalWindow, RENTAL_RESERVATION_SELECT } from './rental-reservation.js';
import { guestBookingFingerprint } from './guest-booking-security.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { RoomTypesService } from '../room-types/room-types.service.js';
import { RoomAssignmentsService } from './room-assignments.service.js';
import { ReservationCancellationService } from './reservation-cancellation.service.js';
import { RoomBlocksService } from '../room-blocks/room-blocks.service.js';
import { PayAtPropertyService } from '../payments/pay-at-property.service.js';

let directory = '';
let prisma: PrismaClient;
let acquisition: ReservationAcquisitionService;
let stays: ReservationStayService;
let guests: GuestBookingService;
let availability: AvailabilityService;
let actor: AuthenticatedUser;

async function fixture() {
  const property = await prisma.property.findFirstOrThrow();
  const category = await prisma.roomType.create({
    data: {
      propertyId: property.id, name: 'Synthetic ' + randomUUID(),
      capacity: 3, includedOccupancy: 2, baseRateCentavos: 300_000,
      rentalRates: { create: [
        { rentalType: 'HOURLY', rateCentavos: 45_000, extraPersonFeeCentavos: 10_000 },
        { rentalType: 'NIGHTLY', rateCentavos: 300_000, extraPersonFeeCentavos: 50_000 },
        { rentalType: 'WEEKLY', rateCentavos: 1_800_000, extraPersonFeeCentavos: 300_000 },
        { rentalType: 'MONTHLY', rateCentavos: 6_750_000, extraPersonFeeCentavos: 1_125_000 },
      ] },
    },
  });
  const room = await prisma.room.create({
    data: { roomTypeId: category.id, roomNumber: randomUUID(), status: 'READY' },
  });
  const input: CreateReservationDto = {
    roomTypeId: category.id, checkIn: '2030-01-01', checkOut: '2030-01-01',
    rentalType: 'HOURLY', rentalUnits: 2, arrivalTime: '15:00',
    guests: 3, firstName: 'Synthetic', lastName: 'Guest', email: 'test@example.invalid',
  };
  return { category, room, input };
}

async function paidAssignment(booking: { id: string; totalAmountCentavos: number }, roomId: string) {
  const assignment = await prisma.roomAssignment.create({ data: { reservationId: booking.id, roomId } });
  await prisma.payment.create({
    data: {
      reservationId: booking.id, method: 'PAY_AT_PROPERTY', status: 'PAID',
      amountCentavos: booking.totalAmountCentavos, paidAt: new Date(),
    },
  });
  return assignment;
}

describe('reservation intervals and immutable rental prices', () => {
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-intervals-'));
    const path = join(directory, 'intervals.test.db');
    const sqlite = new Database(path);
    try {
      for (const entry of readdirSync(resolve('prisma/migrations'), { withFileTypes: true })
        .filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        sqlite.exec(readFileSync(join(resolve('prisma/migrations'), entry.name, 'migration.sql'), 'utf8'));
      }
    } finally { sqlite.close(); }
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: 'file:' + path.replaceAll('\\', '/') }),
    });
    await prisma.$connect();
    await prisma.property.create({
      data: { name: 'Synthetic property', address: 'Test', city: 'Test', province: 'Test' },
    });
    const role = await prisma.role.create({ data: { name: 'RECEPTIONIST' } });
    const user = await prisma.user.create({
      data: {
        name: 'Synthetic staff', email: randomUUID() + '@example.invalid',
        passwordHash: 'unused', status: 'ACTIVE', roleId: role.id,
      },
    });
    actor = { id: user.id, email: user.email, role: 'RECEPTIONIST' };
    const service = prisma as unknown as PrismaService;
    const capacity = new RoomRateCapacityService();
    acquisition = new ReservationAcquisitionService(service, new ReservationValidationService(service, capacity));
    stays = new ReservationStayService(service, new InventorySafetyService(service, capacity));
    guests = new GuestBookingService(service, acquisition);
    availability = new AvailabilityService(service);
  }, 20_000);

  afterEach(() => vi.useRealTimers());
  afterAll(async () => {
    await prisma?.$disconnect();
    if (directory) {
      const target = resolve(directory);
      if (!target.startsWith(resolve(tmpdir()) + sep) || !basename(target).startsWith('nexora-intervals-')) {
        throw new Error('Unexpected temporary test directory.');
      }
      rmSync(target, { recursive: true, force: true });
    }
  });

  function clock() {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-01T06:00:00Z'));
  }

  it('rejects an overlap and permits an adjacent hourly stay', async () => {
    clock();
    const { input } = await fixture();
    const booking = await acquisition.acquire(input, 'CONFIRMED');
    expect(booking.totalAmountCentavos).toBe(110_000);
    await expect(acquisition.acquire({ ...input, arrivalTime: '16:00' }, 'CONFIRMED'))
      .rejects.toBeInstanceOf(ConflictException);
    await expect(acquisition.acquire({ ...input, arrivalTime: '17:00' }, 'CONFIRMED'))
      .resolves.toMatchObject({ totalAmountCentavos: 110_000 });
  });

  it('serializes competing acquisitions without overselling', async () => {
    clock();
    const { input } = await fixture();
    const outcomes = await Promise.allSettled([
      acquisition.acquire(input, 'CONFIRMED'), acquisition.acquire(input, 'CONFIRMED'),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.reservation.count({ where: { roomTypeId: input.roomTypeId } })).toBe(1);
  });

  it('protects legacy reservations and calendar-date maintenance blocks', async () => {
    clock();
    const { input, room } = await fixture();
    const legacy = { ...input };
    delete legacy.rentalType; delete legacy.rentalUnits; delete legacy.arrivalTime;
    await acquisition.acquire({ ...legacy, checkOut: '2030-01-02' }, 'CONFIRMED');
    await expect(acquisition.acquire(input, 'CONFIRMED')).rejects.toBeInstanceOf(ConflictException);
    const other = await fixture();
    await prisma.roomBlock.create({ data: {
      roomId: other.room.id, reason: 'Synthetic maintenance',
      startDate: new Date('2030-01-01T00:00:00Z'), endDate: new Date('2030-01-02T00:00:00Z'),
    } });
    await expect(acquisition.acquire(other.input, 'CONFIRMED')).rejects.toBeInstanceOf(ConflictException);
    expect(room.id).not.toBe(other.room.id);
  });

  it('requires one physical room for the entire stay', async () => {
    clock();
    const { input, room, category } = await fixture();
    const second = await prisma.room.create({
      data: { roomTypeId: category.id, roomNumber: randomUUID(), status: 'READY' },
    });
    await prisma.roomBlock.createMany({ data: [
      { roomId: room.id, reason: 'First day', startDate: new Date('2030-01-01'), endDate: new Date('2030-01-02') },
      { roomId: second.id, reason: 'Second day', startDate: new Date('2030-01-02'), endDate: new Date('2030-01-03') },
    ] });
    const request = { ...input, rentalType: 'NIGHTLY' as const, rentalUnits: 2, checkOut: '2030-01-03' };
    const result = await availability.search(request);
    expect(result.find((item) => item.id === category.id)?.available).toBe(false);
    await expect(acquisition.acquire(request, 'CONFIRMED')).rejects.toBeInstanceOf(ConflictException);
  });

  it('replays the saved price after a rate edit and rejects changed rental units', async () => {
    clock();
    const { input, category } = await fixture();
    const role = await prisma.role.upsert({ where: { name: 'GUEST' }, create: { name: 'GUEST' }, update: {} });
    const user = await prisma.user.create({ data: {
      name: 'Synthetic account', email: randomUUID() + '@example.invalid',
      passwordHash: 'unused', status: 'ACTIVE', roleId: role.id,
      guest: { create: { firstName: 'Synthetic', lastName: 'Account' } },
    } });
    const identity = { id: user.id, email: user.email, role: 'GUEST' };
    const request = {
      ...input, requestId: randomUUID(), recoveryToken: 'a'.repeat(64),
      paymentPreference: 'PAY_AT_PROPERTY', acknowledgmentAccepted: true,
    };
    const original = await guests.create(request, identity);
    await prisma.rentalRate.update({
      where: { roomTypeId_rentalType: { roomTypeId: category.id, rentalType: 'HOURLY' } },
      data: { rateCentavos: 90_000 },
    });
    expect(await guests.create(request, identity)).toMatchObject({
      reservationNumber: original.reservationNumber, totalAmountCentavos: 110_000, replayed: true,
    });
    await expect(guests.create({ ...request, rentalUnits: 3 }, identity))
      .rejects.toBeInstanceOf(ConflictException);
    expect(await guests.recover(request.requestId, request.recoveryToken, identity))
      .toMatchObject({ totalAmountCentavos: 110_000 });
  });

  it('preserves the original paid departure on late arrival and records checkout', async () => {
    clock();
    const { input, room } = await fixture();
    const booking = await acquisition.acquire({
      ...input, rentalType: 'NIGHTLY', rentalUnits: 1, checkOut: '2030-01-02',
    }, 'CONFIRMED');
    const assignment = await paidAssignment(booking, room.id);
    vi.setSystemTime(new Date('2030-01-01T08:00:00Z'));
    await stays.checkIn(booking.id, assignment.id, true, actor);
    const row = await prisma.reservation.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row.scheduledDepartureAt?.toISOString()).toBe('2030-01-02T07:00:00.000Z');
    expect(row.inventoryEndAt?.toISOString()).toBe('2030-01-02T07:00:00.000Z');
    expect(row.actualArrivalAt?.toISOString()).toBe('2030-01-01T08:00:00.000Z');
    expect(row.totalAmountCentavos).toBe(350_000);
    await stays.checkIn(booking.id, assignment.id, true, actor);
    await stays.checkOut(booking.id, assignment.id, actor);
    expect(await prisma.reservation.findUnique({ where: { id: booking.id } }))
      .toMatchObject({ status: 'CHECKED_OUT', actualDepartureAt: new Date('2030-01-01T08:00:00Z') });
  });

  it('keeps a paid late arrival from extending into the next booking', async () => {
    clock();
    const { input, room } = await fixture();
    const request = { ...input, rentalType: 'NIGHTLY' as const, rentalUnits: 1, checkOut: '2030-01-02' };
    const booking = await acquisition.acquire(request, 'CONFIRMED');
    const assignment = await paidAssignment(booking, room.id);
    await acquisition.acquire({ ...request, checkIn: '2030-01-02', checkOut: '2030-01-03' }, 'CONFIRMED');
    vi.setSystemTime(new Date('2030-01-01T08:00:00Z'));
    await stays.checkIn(booking.id, assignment.id, true, actor);
    expect(await prisma.reservation.findUnique({ where: { id: booking.id } })).toMatchObject({
      status: 'CHECKED_IN', actualArrivalAt: new Date('2030-01-01T08:00:00Z'),
      inventoryEndAt: new Date('2030-01-02T07:00:00Z'),
    });
    expect(await prisma.room.findUnique({ where: { id: room.id } })).toMatchObject({ status: 'OCCUPIED' });
  });


  it('protects an overdue checked-in room and category until physical checkout', async () => {
    clock();
    const { input, room, category } = await fixture();
    const other = await fixture();
    const booking = await acquisition.acquire(input, 'CONFIRMED');
    const assignment = await paidAssignment(booking, room.id);
    vi.setSystemTime(new Date('2030-01-01T07:00:00Z'));
    await stays.checkIn(booking.id, assignment.id, true, actor);
    vi.setSystemTime(new Date('2030-01-01T10:00:00Z'));
    const service = prisma as unknown as PrismaService;
    const rooms = new RoomsService(service);
    const categories = new RoomTypesService(service, new RoomRateCapacityService());
    await expect(rooms.update(room.id, { isActive: false })).rejects.toBeInstanceOf(ConflictException);
    await expect(rooms.update(room.id, { roomTypeId: other.category.id })).rejects.toBeInstanceOf(ConflictException);
    await expect(categories.update(category.id, { isActive: false })).rejects.toBeInstanceOf(ConflictException);
    await expect(categories.update(category.id, { capacity: 2 })).rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.room.findUnique({ where: { id: room.id } })).toMatchObject({
      isActive: true, roomTypeId: category.id, status: 'OCCUPIED',
    });
    expect(await prisma.roomType.findUnique({ where: { id: category.id } }))
      .toMatchObject({ isActive: true, capacity: 3 });
  });

  it('uses the saved end in same-day collection, cancellation and assignment services', async () => {
    clock();
    const paid = await fixture();
    const cancelled = await fixture();
    const expired = await fixture();
    const assigned = await fixture();
    const paidBooking = await acquisition.acquire(paid.input, 'CONFIRMED');
    const cancelledBooking = await acquisition.acquire(cancelled.input, 'CONFIRMED');
    const expiredBooking = await acquisition.acquire(expired.input, 'CONFIRMED');
    const assignedBooking = await acquisition.acquire(assigned.input, 'CONFIRMED');
    const service = prisma as unknown as PrismaService;
    const payments = new PayAtPropertyService(service);
    const cancellations = new ReservationCancellationService(service);
    const assignments = new RoomAssignmentsService(
      service, new InventorySafetyService(service, new RoomRateCapacityService()),
    );
    vi.setSystemTime(new Date('2030-01-01T08:00:00Z'));
    await expect(payments.record(paidBooking.id, {
      requestId: randomUUID(), amountCentavos: paidBooking.totalAmountCentavos, collectionConfirmed: true,
    }, actor)).resolves.toMatchObject({ reservationStatus: 'CONFIRMED' });
    await expect(cancellations.cancel(cancelledBooking.id, 'Synthetic cancellation', actor))
      .resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(assignments.assign(assignedBooking.id, assigned.room.id, actor))
      .resolves.toMatchObject({ roomId: assigned.room.id });
    await expect(new RoomBlocksService(service).create(assigned.room.id, {
      startDate: '2030-01-01', endDate: '2030-01-02', reason: 'Synthetic conflict',
    })).rejects.toBeInstanceOf(ConflictException);
    vi.setSystemTime(new Date('2030-01-01T09:00:00Z'));
    await expect(payments.record(expiredBooking.id, {
      requestId: randomUUID(), amountCentavos: expiredBooking.totalAmountCentavos, collectionConfirmed: true,
    }, actor)).rejects.toBeInstanceOf(ConflictException);
    await expect(cancellations.cancel(expiredBooking.id, 'Synthetic cancellation', actor))
      .rejects.toBeInstanceOf(ConflictException);
    await expect(assignments.assign(expiredBooking.id, expired.room.id, actor))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects early check-in when it would overlap the previous commitment', async () => {
    clock();
    vi.setSystemTime(new Date('2029-12-31T06:00:00Z'));
    const { input, room } = await fixture();
    await acquisition.acquire({
      ...input, rentalType: 'NIGHTLY', rentalUnits: 1,
      checkIn: '2029-12-31', checkOut: '2030-01-01',
    }, 'CONFIRMED');
    const booking = await acquisition.acquire(input, 'CONFIRMED');
    const assignment = await paidAssignment(booking, room.id);
    vi.setSystemTime(new Date('2030-01-01T06:30:00Z'));
    await expect(stays.checkIn(booking.id, assignment.id, true, actor))
      .rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.reservation.findUnique({ where: { id: booking.id } }))
      .toMatchObject({ status: 'CONFIRMED', actualArrivalAt: null });
  });

  it.each(['HOURLY', 'NIGHTLY', 'WEEKLY', 'MONTHLY'] as const)(
    'keeps the booked %s departure for a paid late arrival', (rentalType) => {
      const hours = { HOURLY: 2, NIGHTLY: 24, WEEKLY: 168, MONTHLY: 720 }[rentalType];
      const arrival = new Date('2030-01-01T07:00:00Z');
      const departure = new Date(arrival.getTime() + hours * 60 * 60 * 1000);
      const booking = {
        rentalType, rentalUnits: rentalType === 'HOURLY' ? 2 : 1,
        scheduledArrivalAt: arrival, scheduledDepartureAt: departure,
      };
      expect(actualRentalWindow(booking, new Date(arrival.getTime() + 60 * 60 * 1000), true).end)
        .toEqual(departure);
      expect(() => actualRentalWindow(booking, departure, true)).toThrow(ConflictException);
    },
  );

  it('permits exactly 30 minutes early and rejects one millisecond earlier', () => {
    const booking = {
      rentalType: 'NIGHTLY' as const, rentalUnits: 1,
      scheduledArrivalAt: new Date('2030-01-01T07:00:00Z'),
      scheduledDepartureAt: new Date('2030-01-02T07:00:00Z'),
    };
    expect(actualRentalWindow(booking, new Date('2030-01-01T06:30:00Z')).end.toISOString())
      .toBe('2030-01-02T06:30:00.000Z');
    expect(() => actualRentalWindow(booking, new Date('2030-01-01T06:29:59.999Z')))
      .toThrow(ConflictException);
  });

  it('preserves the historical fingerprint payload exactly', () => {
    const request = {
      roomTypeId: 'legacy-category', checkIn: '2030-01-01', checkOut: '2030-01-02',
      guests: 2, arrivalTime: '15:00', paymentPreference: 'PAY_AT_PROPERTY' as const,
      firstName: 'Synthetic', lastName: 'Guest', email: 'test@example.invalid',
      acknowledgmentAccepted: true, requestId: '00000000-0000-4000-8000-000000000000',
      recoveryToken: 'a'.repeat(64),
    };
    const historicalPayload = '{"policyVersion":"guest-booking-v2","roomTypeId":"legacy-category","checkIn":"2030-01-01","checkOut":"2030-01-02","guests":2,"arrivalTime":"15:00","paymentPreference":"PAY_AT_PROPERTY","firstName":"Synthetic","lastName":"Guest","email":"test@example.invalid","phone":null,"acknowledgmentAccepted":true}';
    const expected = createHmac('sha256', Buffer.from(request.recoveryToken, 'hex'))
      .update(historicalPayload, 'utf8').digest('hex');
    expect(guestBookingFingerprint(request)).toBe(expected);
  });

  it('preserves a pre-migration reservation and leaves its new fields null', () => {
    const sqlite = new Database(':memory:');
    try {
      const root = resolve('prisma/migrations');
      const target = '20261115110000_reservation_intervals';
      for (const entry of readdirSync(root, { withFileTypes: true })
        .filter((item) => item.isDirectory() && item.name.localeCompare(target) < 0)
        .sort((a, b) => a.name.localeCompare(b.name))) {
        sqlite.exec(readFileSync(join(root, entry.name, 'migration.sql'), 'utf8'));
      }
      sqlite.exec(`
        INSERT INTO Property (id,name,address,city,province,updatedAt)
          VALUES ('property','Synthetic','Test','Test','Test',CURRENT_TIMESTAMP);
        INSERT INTO RoomType (id,propertyId,name,capacity,baseRateCentavos,updatedAt)
          VALUES ('category','property','Synthetic',2,300000,CURRENT_TIMESTAMP);
        INSERT INTO Guest (id,firstName,lastName,updatedAt)
          VALUES ('guest','Synthetic','Guest',CURRENT_TIMESTAMP);
        INSERT INTO Reservation
          (id,reservationNumber,guestId,roomTypeId,checkInDate,checkOutDate,
           guestCount,nightlyRateCentavos,totalAmountCentavos,status,updatedAt)
          VALUES ('booking','NX-legacy','guest','category','2030-01-01T00:00:00.000Z',
            '2030-01-02T00:00:00.000Z',2,300000,300000,'CONFIRMED',CURRENT_TIMESTAMP);
      `);
      const before = sqlite.prepare('SELECT * FROM Reservation WHERE id = ?').get('booking');
      sqlite.exec(readFileSync(join(root, target, 'migration.sql'), 'utf8'));
      const after = sqlite.prepare('SELECT * FROM Reservation WHERE id = ?')
        .get('booking') as Record<string, unknown>;
      expect(after).toMatchObject(before as Record<string, unknown>);
      for (const field of Object.keys(RENTAL_RESERVATION_SELECT)) expect(after[field]).toBeNull();
    } finally { sqlite.close(); }
  });

  it.each([
    ['WEEKLY', 7], ['MONTHLY', 30],
  ] as const)('uses actual arrival plus the full %s period', (rentalType, days) => {
    const window = actualRentalWindow({
      rentalType, rentalUnits: 1,
      scheduledArrivalAt: new Date('2030-01-01T07:00:00Z'),
      scheduledDepartureAt: new Date('2030-01-31T07:00:00Z'),
    }, new Date('2030-01-01T08:00:00Z'));
    expect(window.end.getTime() - window.start.getTime()).toBe(days * 86_400_000);
  });

  it('keeps same-day checkout eligible only before the saved end time', () => {
    const booking = {
      status: 'CONFIRMED' as const, bookingPolicyVersion: null, paymentPreference: null,
      expectedArrivalAt: null, holdExpiresAt: null, checkOutDate: new Date('2030-01-01'),
      inventoryEndAt: new Date('2030-01-01T09:00:00Z'),
    };
    expect(() => assertCheckoutBookingEligible(booking, new Date('2030-01-01T08:00:00Z')))
      .not.toThrow();
    expect(() => assertCheckoutBookingEligible(booking, new Date('2030-01-01T09:00:00Z')))
      .toThrow(ConflictException);
  });

  it('converts legacy calendar labels and enforces hourly closing time', () => {
    expect(calendarInstant(new Date('2030-01-01')).toISOString()).toBe('2029-12-31T16:00:00.000Z');
    expect(() => reservationWindow({
      checkInDate: new Date('2030-01-01'), checkOutDate: new Date('2030-01-02'),
      inventoryStartAt: new Date('2030-01-01T07:00:00Z'), inventoryEndAt: null,
    })).toThrow(ConflictException);
    expect(() => actualRentalWindow({
      rentalType: 'HOURLY', rentalUnits: 2,
      scheduledArrivalAt: new Date('2030-01-01T13:00:00Z'),
      scheduledDepartureAt: new Date('2030-01-01T15:00:00Z'),
    }, new Date('2030-01-01T13:01:00Z'))).toThrow(ConflictException);
  });
});
