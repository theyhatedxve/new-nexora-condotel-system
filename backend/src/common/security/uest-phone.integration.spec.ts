import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../../../test/helpers/isolated-database.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { OwnershipService } from '../ownership/ownership.service.js';
import { RoomRateCapacityService } from '../validation/room-rate-capacity.service.js';
import { ReservationValidationService } from '../../reservations/inventory/reservation-validation.service.js';
import { ReservationAcquisitionService } from '../../reservations/inventory/reservation-acquisition.service.js';
import { GuestBookingService } from '../../reservations/guest-booking/guest-booking.service.js';
import { StaffReservationsService } from '../../reservations/staff/staff-reservations.service.js';
import { StaffGuestsService } from '../../guests/staff-guests.service.js';
import { migrateGuestPhones } from '../../prisma/guest-phone-migration.js';
import {
  decryptGuestPhone,
  encryptGuestPhone,
} from './guest-phone.crypto.js';

const firstKey = Buffer.alloc(32, 7).toString('base64');
const secondKey = Buffer.alloc(32, 9).toString('base64');

describe('guest phone storage and migration', () => {
  let database: IsolatedTestDatabase | undefined;

  beforeEach(async () => {
    vi.stubEnv('NEXORA_GUEST_PHONE_ACTIVE_KEY_ID', 'phone-v1');
    vi.stubEnv(
      'NEXORA_GUEST_PHONE_KEYS',
      JSON.stringify({ 'phone-v1': firstKey }),
    );
    database = await createIsolatedTestDatabase();
  }, 60_000);

  afterEach(async () => {
    try {
      await database?.dispose();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  async function fixture() {
    const prisma = database!.prisma;
    const property = await prisma.property.create({
      data: {
        name: 'Synthetic', address: 'Synthetic',
        city: 'Synthetic', province: 'Synthetic',
      },
    });
    const type = await prisma.roomType.create({
      data: {
        propertyId: property.id, name: 'Synthetic room',
        capacity: 2, baseRateCentavos: 250000,
      },
    });
    await prisma.room.create({
      data: { roomTypeId: type.id, roomNumber: '101', status: 'READY' },
    });

    const guestRole = await prisma.role.create({ data: { name: 'GUEST' } });
    const staffRole = await prisma.role.create({ data: { name: 'RECEPTIONIST' } });
    const user = await prisma.user.create({
      data: {
        roleId: guestRole.id, name: 'Synthetic Guest',
        email: 'phone-guest@example.test',
        passwordHash: 'unused-test-hash', status: 'ACTIVE',
      },
    });
    const staffUser = await prisma.user.create({
      data: {
        roleId: staffRole.id, name: 'Synthetic Receptionist',
        email: 'phone-staff@example.test',
        passwordHash: 'unused-test-hash', status: 'ACTIVE',
      },
    });
    const guest = await prisma.guest.create({
      data: { userId: user.id, firstName: 'Synthetic', lastName: 'Guest' },
    });

    const service = prisma as unknown as PrismaService;
    const acquisition = new ReservationAcquisitionService(
      service,
      new ReservationValidationService(service, new RoomRateCapacityService()),
    );
    const bookings = new GuestBookingService(service, acquisition);
    const ownership = new OwnershipService(service);
    const staffGuests = new StaffGuestsService(service, ownership);
    const staffReservations = new StaffReservationsService(service, ownership);
    const guestIdentity = { id: user.id, email: user.email, role: 'GUEST' };
    const staffIdentity = {
      id: staffUser.id, email: staffUser.email, role: 'RECEPTIONIST',
    };

    const arrival = new Date(Date.now() + 10 * 86400000);
    const departure = new Date(arrival.getTime() + 86400000);
    const command = {
      requestId: randomUUID(),
      recoveryToken: 'a'.repeat(64),
      roomTypeId: type.id,
      checkIn: arrival.toISOString().slice(0, 10),
      checkOut: departure.toISOString().slice(0, 10),
      guests: 1,
      firstName: 'Synthetic',
      lastName: 'Guest',
      email: user.email,
      phone: '+63 912 345 6789',
      arrivalTime: '14:00',
      paymentPreference: 'PAY_AT_PROPERTY',
      acknowledgmentAccepted: true,
    };

    return {
      prisma, acquisition, bookings, staffGuests, staffReservations,
      guest, guestIdentity, staffIdentity, command,
    };
  }

  it('encrypts booking phones, preserves retries, and decrypts authorized views', async () => {
    const f = await fixture();
    const receipt = await f.bookings.create(f.command, f.guestIdentity);
    const stored = await f.prisma.guest.findUniqueOrThrow({
      where: { id: f.guest.id },
    });

    expect(stored.phone).toContain('nexora-phone:v1:phone-v1:');
    expect(stored.phone).not.toBe(f.command.phone);

    expect(await f.bookings.profile(f.guestIdentity))
      .toMatchObject({ phone: f.command.phone });
    expect(await f.staffGuests.detail(f.guest.id, f.staffIdentity))
      .toMatchObject({ phone: f.command.phone });

    const reservation = await f.prisma.reservation.findUniqueOrThrow({
      where: { reservationNumber: receipt.reservationNumber },
    });
    expect(await f.staffReservations.detail(reservation.id, f.staffIdentity))
      .toMatchObject({ guest: { phone: f.command.phone } });

    await expect(f.staffGuests.detail(f.guest.id, f.guestIdentity))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(await f.bookings.create(f.command, f.guestIdentity))
      .toMatchObject({ replayed: true });

    expect((await f.prisma.guest.findUniqueOrThrow({
      where: { id: f.guest.id },
    })).phone).toBe(stored.phone);
  });

  it('encrypts phones when acquisition creates a new guest', async () => {
    const f = await fixture();
    const receipt = await f.acquisition.acquire({
      roomTypeId: f.command.roomTypeId,
      checkIn: f.command.checkIn,
      checkOut: f.command.checkOut,
      guests: 1,
      firstName: 'New',
      lastName: 'Guest',
      email: 'new-phone-guest@example.test',
      phone: '09123456789',
    }, 'CONFIRMED');

    const saved = await f.prisma.reservation.findUniqueOrThrow({
      where: { id: receipt.id },
      include: { guest: true },
    });

    expect(saved.guest.phone).toContain('nexora-phone:v1:phone-v1:');
    expect(decryptGuestPhone(saved.guest.phone, saved.guest.id))
      .toBe('09123456789');
  });

  it('rolls back booking creation when phone encryption is unavailable', async () => {
    const f = await fixture();
    vi.stubEnv('NEXORA_GUEST_PHONE_KEYS', '{}');

    await expect(f.bookings.create(f.command, f.guestIdentity))
      .rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(await f.prisma.reservation.count()).toBe(0);
    expect(await f.prisma.guestBookingAttempt.count()).toBe(0);
    expect((await f.prisma.guest.findUniqueOrThrow({
      where: { id: f.guest.id },
    })).phone).toBeNull();
  });

  it('keeps legacy phone values readable before migration', async () => {
    const f = await fixture();
    await f.prisma.guest.update({
      where: { id: f.guest.id },
      data: { phone: '09123456789' },
    });
    expect(await f.bookings.profile(f.guestIdentity))
      .toMatchObject({ phone: '09123456789' });
  });

  it('checks without writing and converts legacy values only once', async () => {
    const prisma = database!.prisma;
    const guest = await prisma.guest.create({
      data: { firstName: 'Legacy', lastName: 'Guest', phone: '09123456789' },
    });

    expect(await migrateGuestPhones(prisma, false))
      .toMatchObject({ candidates: 1, updated: 0 });
    expect((await prisma.guest.findUniqueOrThrow({
      where: { id: guest.id },
    })).phone).toBe('09123456789');

    expect(await migrateGuestPhones(prisma, true))
      .toMatchObject({ candidates: 1, updated: 1 });
    const encrypted = (await prisma.guest.findUniqueOrThrow({
      where: { id: guest.id },
    })).phone;

    expect(decryptGuestPhone(encrypted, guest.id)).toBe('09123456789');
    expect(await migrateGuestPhones(prisma, true))
      .toMatchObject({ candidates: 0, updated: 0 });
    expect((await prisma.guest.findUniqueOrThrow({
      where: { id: guest.id },
    })).phone).toBe(encrypted);
  });

  it('rewraps old-key values using the active key', async () => {
    const prisma = database!.prisma;
    const guest = await prisma.guest.create({
      data: { firstName: 'Rotation', lastName: 'Guest' },
    });
    await prisma.guest.update({
      where: { id: guest.id },
      data: { phone: encryptGuestPhone('09123456789', guest.id) },
    });

    vi.stubEnv('NEXORA_GUEST_PHONE_ACTIVE_KEY_ID', 'phone-v2');
    vi.stubEnv(
      'NEXORA_GUEST_PHONE_KEYS',
      JSON.stringify({ 'phone-v1': firstKey, 'phone-v2': secondKey }),
    );

    expect(await migrateGuestPhones(prisma, true))
      .toMatchObject({ updated: 1 });
    const phone = (await prisma.guest.findUniqueOrThrow({
      where: { id: guest.id },
    })).phone;
    expect(phone).toContain('nexora-phone:v1:phone-v2:');
    expect(decryptGuestPhone(phone, guest.id)).toBe('09123456789');
  });

  it('rolls back the whole conversion when an encrypted record is invalid', async () => {
    const prisma = database!.prisma;
    await prisma.guest.create({
      data: {
        id: 'a-first', firstName: 'Legacy', lastName: 'Guest',
        phone: '09123456789',
      },
    });

    const parts = encryptGuestPhone('09999999999', 'z-last')!.split(':');
    parts[4] = (parts[4][0] === 'A' ? 'B' : 'A') + parts[4].slice(1);
    await prisma.guest.create({
      data: {
        id: 'z-last', firstName: 'Invalid', lastName: 'Guest',
        phone: parts.join(':'),
      },
    });

    await expect(migrateGuestPhones(prisma, true))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect((await prisma.guest.findUniqueOrThrow({
      where: { id: 'a-first' },
    })).phone).toBe('09123456789');
  });
});