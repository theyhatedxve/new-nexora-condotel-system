import 'reflect-metadata';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { EmailService } from '../auth/email.service.js';
import { enqueueBookingConfirmationInTx } from './booking-confirmation.queue.js';
import { BookingNotificationsService } from './booking-notifications.service.js';

describe('booking confirmation notifications', () => {
  let directory: string;
  let prisma: PrismaClient;
  let service: BookingNotificationsService;
  let guestId: string;
  let guestUserId: string;
  let roomTypeId: string;
  let sequence = 0;

  const email = {
    assertBookingDeliveryConfigured: vi.fn(),
    sendBookingConfirmation: vi.fn(),
  };

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-booking-email-'));
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: 'file:' + join(directory, 'email.test.db').replaceAll('\\', '/'),
      }),
    });
    await prisma.$connect();
    const root = resolve(process.cwd(), 'prisma/migrations');
    const migrations = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const migration of migrations) {
      const sql = readFileSync(join(root, migration.name, 'migration.sql'), 'utf8');
      for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
    const role = await prisma.role.create({ data: { name: 'GUEST' } });
    const user = await prisma.user.create({
      data: {
        roleId: role.id,
        name: 'Synthetic guest',
        email: 'booking-email@example.test',
        passwordHash: 'synthetic-unused-hash',
        status: 'ACTIVE',
      },
    });
    guestUserId = user.id;
    const guest = await prisma.guest.create({
      data: { userId: user.id, firstName: 'Synthetic', lastName: 'Guest' },
    });
    guestId = guest.id;
    const property = await prisma.property.create({
      data: { name: 'Synthetic', address: 'Synthetic', city: 'Synthetic', province: 'Synthetic' },
    });
    const roomType = await prisma.roomType.create({
      data: { propertyId: property.id, name: 'Synthetic Deluxe', capacity: 2, baseRateCentavos: 450000 },
    });
    roomTypeId = roomType.id;
    service = new BookingNotificationsService(
      prisma as unknown as PrismaService,
      email as unknown as EmailService,
    );
  }, 60000);

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.stubEnv('NEXORA_GUEST_WEB_URL', 'http://localhost:5175');
    email.sendBookingConfirmation.mockResolvedValue('SMTP_ACCEPTED');
    await prisma.bookingNotification.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.user.update({ where: { id: guestUserId }, data: { status: 'ACTIVE' } });
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    try {
      if (prisma) await prisma.$disconnect();
    } finally {
      if (directory) rmSync(directory, { recursive: true, force: true });
    }
  });

  async function booking(status: 'PENDING' | 'CONFIRMED' = 'CONFIRMED') {
    sequence += 1;
    return prisma.reservation.create({
      data: {
        reservationNumber: `NOTIFICATION-${sequence}`,
        guestId,
        roomTypeId,
        status,
        confirmedAt: status === 'CONFIRMED' ? new Date() : null,
        paymentPreference: 'PAY_AT_PROPERTY',
        checkInDate: new Date('2030-01-01T00:00:00Z'),
        checkOutDate: new Date('2030-01-02T00:00:00Z'),
        guestCount: 2,
        nightlyRateCentavos: 450000,
        totalAmountCentavos: 450000,
      },
    });
  }

  async function enqueue(reservationId: string) {
    await prisma.$transaction((tx) => enqueueBookingConfirmationInTx(tx, reservationId));
  }

  it('deduplicates repeated queue requests', async () => {
    const record = await booking();
    await enqueue(record.id);
    await enqueue(record.id);
    expect(await prisma.bookingNotification.count()).toBe(1);
  });

  it('rolls back the queue entry with the confirmation transaction', async () => {
    const record = await booking('PENDING');
    await expect(prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: record.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      await enqueueBookingConfirmationInTx(tx, record.id);
      throw new Error('Synthetic transaction rollback');
    })).rejects.toThrow('Synthetic transaction rollback');
    expect(await prisma.bookingNotification.count()).toBe(0);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: record.id } })).status).toBe('PENDING');
  });

  it('records SMTP acceptance and sends a known booking only once', async () => {
    const record = await booking();
    await enqueue(record.id);
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.to).toBe('booking-email@example.test');
    expect(message.text).toContain(record.reservationNumber);
    expect(message.text).toContain('Synthetic Deluxe');
    expect(message.text).toContain('http://localhost:5175/my-bookings/' + record.id);
    expect(message.text).toContain('Pay at Property');
    const delivery = await prisma.bookingNotification.findFirstOrThrow();
    expect(delivery.status).toBe('SMTP_ACCEPTED');
    expect(delivery.smtpAcceptedAt).toBeInstanceOf(Date);
  });

  it('retains uncertain delivery for review without another automatic send', async () => {
    const record = await booking();
    await enqueue(record.id);
    email.sendBookingConfirmation.mockRejectedValueOnce(new Error('Synthetic SMTP interruption'));
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'REVIEW_REQUIRED', failureCode: 'SMTP_OUTCOME_UNKNOWN',
    });
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: record.id } })).status).toBe('CONFIRMED');
  });

  it('skips a booking that was cancelled before delivery', async () => {
    const record = await booking();
    await enqueue(record.id);
    await prisma.reservation.update({ where: { id: record.id }, data: { status: 'CANCELLED' } });
    await service.runOnce();
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'SKIPPED', failureCode: 'RESERVATION_CHANGED',
    });
  });

  it('skips delivery when the guest account is disabled', async () => {
    const record = await booking();
    await enqueue(record.id);
    await prisma.user.update({ where: { id: guestUserId }, data: { status: 'DISABLED' } });
    await service.runOnce();
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'SKIPPED', failureCode: 'RECIPIENT_UNAVAILABLE',
    });
  });

  it('keeps unclaimed work pending when configuration is unavailable', async () => {
    const record = await booking();
    await enqueue(record.id);
    email.assertBookingDeliveryConfigured.mockImplementationOnce(() => {
      throw new Error('Synthetic missing SMTP configuration');
    });
    await expect(service.runOnce()).rejects.toThrow('Synthetic missing SMTP');
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect((await prisma.bookingNotification.findFirstOrThrow()).status).toBe('PENDING');
  });

  it('preserves an interrupted sending record for manual review', async () => {
    const record = await booking();
    await enqueue(record.id);
    await prisma.bookingNotification.updateMany({ data: { status: 'SENDING', claimedAt: new Date() } });
    await service.runOnce();
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect((await prisma.bookingNotification.findFirstOrThrow()).status).toBe('SENDING');
  });
});
