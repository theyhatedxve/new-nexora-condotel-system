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
import {
  CANCELLATION_TEMPLATE,
  PAYMENT_UPDATE_PREFIX,
  REFUND_COMPLETION_PREFIX,
  enqueueBookingCancellationInTx,
  enqueuePaymentUpdateInTx,
  enqueueRefundCompletionInTx,
} from './booking-updates.queue.js';
import { CHECKOUT_PAID_EVENT } from '../payments/paymongo-webhook.payload.js';

describe('booking notifications', () => {
  let directory: string;
  let prisma: PrismaClient;
  let service: BookingNotificationsService;
  let guestId: string;
  let guestUserId: string;
  let refundActorId: string;
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
    const refundRole = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
    const refundActor = await prisma.user.create({
      data: {
        roleId: refundRole.id,
        name: 'Synthetic refund administrator',
        email: 'refund-admin@example.test',
        passwordHash: 'synthetic-unused-hash',
        status: 'ACTIVE',
      },
    });
    refundActorId = refundActor.id;
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
    await prisma.paymentEvent.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.payment.deleteMany();
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

  async function propertyPayment(reservationId: string, amountCentavos = 100000) {
    return prisma.payment.create({
      data: {
        reservationId,
        method: 'PAY_AT_PROPERTY',
        status: 'PAID',
        amountCentavos,
        currency: 'PHP',
        paidAt: new Date(),
      },
    });
  }

  async function queuePayment(reservationId: string, paymentId: string) {
    await prisma.$transaction((tx) =>
      enqueuePaymentUpdateInTx(tx, reservationId, paymentId),
    );
  }

  async function queueCancellation(reservationId: string) {
    await prisma.$transaction((tx) =>
      enqueueBookingCancellationInTx(tx, reservationId),
    );
  }

  it('deduplicates each payment while allowing multiple payments per booking', async () => {
    const record = await booking();
    const first = await propertyPayment(record.id);
    const second = await propertyPayment(record.id);
    await queuePayment(record.id, first.id);
    await queuePayment(record.id, first.id);
    await queuePayment(record.id, second.id);
    expect(await prisma.bookingNotification.count()).toBe(2);
    expect(await prisma.bookingNotification.findMany({
      select: { templateKey: true },
    })).toEqual(expect.arrayContaining([
      { templateKey: PAYMENT_UPDATE_PREFIX + first.id },
      { templateKey: PAYMENT_UPDATE_PREFIX + second.id },
    ]));
  });

  it('rolls back a payment and its notification together', async () => {
    const record = await booking();
    await expect(prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          reservationId: record.id,
          method: 'PAY_AT_PROPERTY',
          status: 'PAID',
          amountCentavos: 100000,
          currency: 'PHP',
          paidAt: new Date(),
        },
      });
      await enqueuePaymentUpdateInTx(tx, record.id, payment.id);
      throw new Error('Synthetic payment rollback');
    })).rejects.toThrow('Synthetic payment rollback');
    expect(await prisma.payment.count()).toBe(0);
    expect(await prisma.bookingNotification.count()).toBe(0);
  });

  it('sends one property-payment update with the current booking balance', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id);
    await queuePayment(record.id, payment.id);
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.subject).toBe('Your NEXORA payment update');
    expect(message.text).toContain('Current reservation status: CONFIRMED');
    expect(message.text).toContain('Payment method: Pay at Property');
    expect(message.text).toContain('Current booking payment status: PARTIALLY_PAID');
    expect(message.text).toContain('1,000.00');
    expect(message.text).toContain('3,500.00');
    expect(message.text).toContain('/my-bookings/' + record.id);
  });

  it('uses verified PayMongo evidence when preparing a payment update', async () => {
    const record = await booking();
    const suffix = record.id;
    const payment = await prisma.payment.create({
      data: {
        reservationId: record.id,
        method: 'PAYMONGO',
        status: 'PAID',
        amountCentavos: 450000,
        currency: 'PHP',
        paidAt: new Date(),
        provider: 'PAYMONGO',
        providerCheckoutId: 'checkout-' + suffix,
        providerPaymentId: 'provider-payment-' + suffix,
      },
    });
    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: 'event-' + suffix,
        eventType: CHECKOUT_PAID_EVENT,
        status: 'PROCESSED',
        signatureVerified: true,
        processedAt: new Date(),
        payloadJson: JSON.stringify({
          version: 1,
          livemode: false,
          reference: payment.id,
          checkoutSessionId: payment.providerCheckoutId,
          providerPaymentId: payment.providerPaymentId,
          amountCentavos: payment.amountCentavos,
          currency: 'PHP',
        }),
      },
    });
    await queuePayment(record.id, payment.id);
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.text).toContain('Payment method: PayMongo test checkout');
    expect(message.text).toContain('Current booking payment status: PAID');
    expect(message.text).not.toContain('Payment status: REVIEW_REQUIRED');
  });

  it('warns instead of treating an unsupported paid status as verified', async () => {
    const record = await booking();
    const payment = await prisma.payment.create({
      data: {
        reservationId: record.id,
        method: 'PAYMONGO',
        status: 'PAID',
        amountCentavos: 450000,
        currency: 'PHP',
        paidAt: new Date(),
        provider: 'PAYMONGO',
      },
    });
    await queuePayment(record.id, payment.id);
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.text).toContain('Payment status: REVIEW_REQUIRED');
    expect(message.text).not.toContain('Recorded payment amount:');
    expect(message.text).not.toContain('Current booked-stay balance:');
  });

  it('preserves cancellation and review warnings for a late payment update', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id);
    await queuePayment(record.id, payment.id);
    await prisma.reservation.update({
      where: { id: record.id }, data: { status: 'CANCELLED' },
    });
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.text).toContain('Current reservation status: CANCELLED');
    expect(message.text).toContain('Payment status: REVIEW_REQUIRED');
    expect(message.text).not.toContain('Current booked-stay balance:');
  });

  it('deduplicates cancellation notices and sends the authenticated booking link', async () => {
    const record = await booking();
    await prisma.reservation.update({
      where: { id: record.id }, data: { status: 'CANCELLED' },
    });
    await queueCancellation(record.id);
    await queueCancellation(record.id);
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.subject).toBe('Your NEXORA reservation cancellation');
    expect(message.text).toContain('Current reservation status: CANCELLED');
    expect(message.text).toContain('does not promise or confirm a refund');
    expect(message.text).toContain('/my-bookings/' + record.id);
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      templateKey: CANCELLATION_TEMPLATE, status: 'SMTP_ACCEPTED',
    });
  });

  it('rolls back cancellation and its queue entry together', async () => {
    const record = await booking();
    await expect(prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: record.id }, data: { status: 'CANCELLED' },
      });
      await enqueueBookingCancellationInTx(tx, record.id);
      throw new Error('Synthetic cancellation rollback');
    })).rejects.toThrow('Synthetic cancellation rollback');
    expect(await prisma.bookingNotification.count()).toBe(0);
    expect((await prisma.reservation.findUniqueOrThrow({
      where: { id: record.id },
    })).status).toBe('CONFIRMED');
  });

  it('skips a cancellation notice when the current reservation is not cancelled', async () => {
    const record = await booking();
    await queueCancellation(record.id);
    await service.runOnce();
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'SKIPPED', failureCode: 'RESERVATION_CHANGED',
    });
  });

  it('does not retry an uncertain payment email or undo the payment', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id);
    await queuePayment(record.id, payment.id);
    email.sendBookingConfirmation.mockResolvedValueOnce('UNKNOWN');
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'REVIEW_REQUIRED', failureCode: 'SMTP_OUTCOME_UNKNOWN',
    });
    expect((await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    })).status).toBe('PAID');
  });

  it('retains cancellation when SMTP delivery fails', async () => {
    const record = await booking();
    await prisma.reservation.update({
      where: { id: record.id }, data: { status: 'CANCELLED' },
    });
    await queueCancellation(record.id);
    email.sendBookingConfirmation.mockRejectedValueOnce(
      new Error('Synthetic cancellation email failure'),
    );
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'REVIEW_REQUIRED', failureCode: 'SMTP_OUTCOME_UNKNOWN',
    });
    expect((await prisma.reservation.findUniqueOrThrow({
      where: { id: record.id },
    })).status).toBe('CANCELLED');
  });

  async function completedRefund(
    paymentId: string,
    amountCentavos = 100000,
    providerRefundId: string | null = null,
  ) {
    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId, amountCentavos, reason: 'duplicate',
          status: 'COMPLETED', completedAt: new Date(),
          processedByUserId: refundActorId, providerRefundId,
        },
      });
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId }, include: { refunds: true },
      });
      const refunded = payment.refunds
        .filter((entry) => entry.status === 'COMPLETED')
        .reduce((sum, entry) => sum + entry.amountCentavos, 0);
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: refunded === payment.amountCentavos ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
      return refund;
    });
  }

  async function queueRefund(reservationId: string, refundId: string) {
    await prisma.$transaction((tx) =>
      enqueueRefundCompletionInTx(tx, reservationId, refundId),
    );
  }

  it('deduplicates each refund while allowing multiple refunds per booking', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const first = await completedRefund(payment.id);
    const second = await completedRefund(payment.id);
    await queueRefund(record.id, first.id);
    await queueRefund(record.id, first.id);
    await queueRefund(record.id, second.id);
    expect(await prisma.bookingNotification.count()).toBe(2);
    expect(await prisma.bookingNotification.findMany({
      select: { templateKey: true },
    })).toEqual(expect.arrayContaining([
      { templateKey: REFUND_COMPLETION_PREFIX + first.id },
      { templateKey: REFUND_COMPLETION_PREFIX + second.id },
    ]));
  });

  it('sends a partial property-refund notice once with current booking information', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const refund = await completedRefund(payment.id);
    await queueRefund(record.id, refund.id);
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.subject).toBe('Your NEXORA refund completion');
    expect(message.text).toContain('Refund amount:');
    expect(message.text).toContain('1,000.00');
    expect(message.text).toContain('3,500.00');
    expect(message.text).toContain('Refund method: Pay at Property');
    expect(message.text).toContain('Current reservation status: CONFIRMED');
    expect(message.text).toContain('/my-bookings/' + record.id);
    expect(message.text).not.toContain('duplicate');
    expect(message.text).not.toContain('refund-admin@example.test');
  });

  it('reports a full refund without cancelling the reservation', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const refund = await completedRefund(payment.id, 450000);
    await queueRefund(record.id, refund.id);
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.text).toContain('Current booking payment status: REFUNDED');
    expect(message.text).toContain('4,500.00');
    expect(message.text).toContain('does not confirm a reservation cancellation');
    expect((await prisma.reservation.findUniqueOrThrow({
      where: { id: record.id },
    })).status).toBe('CONFIRMED');
  });

  it('skips a refund that is no longer completed', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const refund = await completedRefund(payment.id);
    await queueRefund(record.id, refund.id);
    await prisma.refund.update({
      where: { id: refund.id }, data: { status: 'PENDING', completedAt: null },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } });
    await service.runOnce();
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'SKIPPED', failureCode: 'INVALID_MESSAGE',
    });
  });

  it('identifies verified PayMongo refunds as test-mode completion', async () => {
    const record = await booking();
    const original = await propertyPayment(record.id, 450000);
    const payment = await prisma.payment.update({
      where: { id: original.id },
      data: {
        method: 'PAYMONGO', provider: 'PAYMONGO',
        providerCheckoutId: 'checkout-' + original.id,
        providerPaymentId: 'payment-' + original.id,
      },
    });
    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        providerEventId: 'refund-payment-proof-' + payment.id,
        eventType: CHECKOUT_PAID_EVENT,
        status: 'PROCESSED', signatureVerified: true, processedAt: new Date(),
        payloadJson: JSON.stringify({
          version: 1, livemode: false, reference: payment.id,
          checkoutSessionId: payment.providerCheckoutId,
          providerPaymentId: payment.providerPaymentId,
          amountCentavos: payment.amountCentavos, currency: 'PHP',
        }),
      },
    });
    const refund = await completedRefund(payment.id, 100000, 'ref_' + payment.id);
    await queueRefund(record.id, refund.id);
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.subject).toBe('Your NEXORA refund completion');
    expect(message.text).toContain('Refund method: PayMongo test refund');
    expect(message.text).toContain('does not confirm real bank settlement');
  });

  it('uses a review notice when the original online payment lacks evidence', async () => {
    const record = await booking();
    const original = await propertyPayment(record.id, 450000);
    const payment = await prisma.payment.update({
      where: { id: original.id },
      data: {
        method: 'PAYMONGO', provider: 'PAYMONGO',
        providerCheckoutId: 'unverified-checkout-' + original.id,
        providerPaymentId: 'unverified-payment-' + original.id,
      },
    });
    const refund = await completedRefund(payment.id, 100000, 'ref_' + payment.id);
    await queueRefund(record.id, refund.id);
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.subject).toBe('Your NEXORA refund update');
    expect(message.text).toContain('Current booking payment status: REVIEW_REQUIRED');
    expect(message.text).not.toContain('Refund amount:');
    expect(message.text).not.toContain('recorded as completed in NEXORA');
  });

  it('retains closed booking status and financial review warnings', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const refund = await completedRefund(payment.id, 450000);
    await prisma.reservation.update({
      where: { id: record.id }, data: { status: 'CANCELLED' },
    });
    await queueRefund(record.id, refund.id);
    await service.runOnce();
    const message = email.sendBookingConfirmation.mock.calls[0][0];
    expect(message.subject).toBe('Your NEXORA refund completion');
    expect(message.text).toContain('Current reservation status: CANCELLED');
    expect(message.text).toContain('Current booking payment status: REVIEW_REQUIRED');
    expect(message.text).toContain('Refund amount:');
    expect(message.text).not.toContain('Current booked-stay balance:');
  });

  it('rolls back refund completion and its queue entry together', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    await expect(prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id, amountCentavos: 100000, reason: 'duplicate',
          status: 'COMPLETED', completedAt: new Date(), processedByUserId: refundActorId,
        },
      });
      await tx.payment.update({
        where: { id: payment.id }, data: { status: 'PARTIALLY_REFUNDED' },
      });
      await enqueueRefundCompletionInTx(tx, record.id, refund.id);
      throw new Error('Synthetic refund rollback');
    })).rejects.toThrow('Synthetic refund rollback');
    expect(await prisma.refund.count()).toBe(0);
    expect(await prisma.bookingNotification.count()).toBe(0);
    expect((await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    })).status).toBe('PAID');
  });

  it('preserves completed refunds when SMTP delivery fails', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const refund = await completedRefund(payment.id);
    await queueRefund(record.id, refund.id);
    email.sendBookingConfirmation.mockRejectedValueOnce(
      new Error('Synthetic refund email failure'),
    );
    await service.runOnce();
    await service.runOnce();
    expect(email.sendBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'REVIEW_REQUIRED', failureCode: 'SMTP_OUTCOME_UNKNOWN',
    });
    expect((await prisma.refund.findUniqueOrThrow({
      where: { id: refund.id },
    })).status).toBe('COMPLETED');
    expect((await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    })).status).toBe('PARTIALLY_REFUNDED');
  });

  it('does not send refund details to a disabled guest account', async () => {
    const record = await booking();
    const payment = await propertyPayment(record.id, 450000);
    const refund = await completedRefund(payment.id);
    await queueRefund(record.id, refund.id);
    await prisma.user.update({
      where: { id: guestUserId }, data: { status: 'DISABLED' },
    });
    await service.runOnce();
    expect(email.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(await prisma.bookingNotification.findFirstOrThrow()).toMatchObject({
      status: 'SKIPPED', failureCode: 'RECIPIENT_UNAVAILABLE',
    });
  });
});
