import 'reflect-metadata';
import { CheckoutService } from './checkout.service.js';
import { PaymongoAdapter } from './paymongo.adapter.js';
import { createHmac, createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { todayInPhilippines } from '../common/validation/philippine-date-range.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { BOOKING_COOKIE } from '../reservations/booking-access.config.js';

import { PaymongoWebhookService } from './paymongo-webhook.service.js';
import { requireFullRecordedPayment } from '../reservations/stay-payment-policy.js';

const webhookSecret = 'isolated-webhook-signing-secret-not-real';
const secret = 'isolated-payment-summary-test-secret-at-least-32-bytes';
let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;
let bookingId: string;
let otherId: string;
let cookie: string;
let users: Record<string, string>;
const path = () => `/api/payments/reservations/${bookingId}/checkout`;
let checkout: CheckoutService;
let provider: { settings: PaymongoAdapter['settings']; create: ReturnType<typeof vi.fn> };
function start(requestId = randomUUID(), role = 'MANAGER') {
  return request(app.getHttpServer()).post(path()).set('Origin', 'http://localhost:5173')
    .set('Authorization', bearer(role)).send({ requestId });
}
function otherClient() {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({
    url: 'file:' + resolve(directory, 'summary.test.db').replaceAll('\\', '/'), timeout: 0,
  }) });
}
function bearer(role = 'MANAGER') { return `Bearer ${jwt.sign({ sub: users[role], jti: randomUUID() })}`; }

describe('Step 7.3 — verified test webhooks', () => {
  beforeEach(async () => {
    vi.stubEnv('JWT_ACCESS_SECRET', secret);
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('PAYMONGO_TEST_WEBHOOK_SECRET', webhookSecret);
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', 'http://localhost:5173');
    vi.stubEnv('PAYMONGO_TEST_SECRET_KEY', 'sk_test_fixture_only');
    vi.stubEnv('PAYMONGO_RETURN_URL', 'http://localhost:5173/payment-return');
    vi.stubEnv('PAYMONGO_PAYMENT_METHODS', 'qrph');
    const realAdapter = new PaymongoAdapter();
    provider = { settings: () => realAdapter.settings(), create: vi.fn().mockResolvedValue({
      id: 'cs_test_session', url: 'https://checkout.paymongo.com/test-session',
    }) };
    directory = mkdtempSync(resolve(process.cwd(), '.phase7-webhook-'));
    prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({
      url: `file:${resolve(directory, 'summary.test.db').replaceAll('\\', '/')}`,
    }) });
    await prisma.$connect();
    const migrations = resolve(process.cwd(), 'prisma/migrations');
    for (const entry of readdirSync(migrations, { withFileTypes: true })
      .filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const sql = readFileSync(resolve(migrations, entry.name, 'migration.sql'), 'utf8');
      for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    }
    const property = await prisma.property.create({ data: { name: 'Test', address: 'Test', city: 'Test', province: 'Test' } });
    const type = await prisma.roomType.create({ data: { propertyId: property.id, name: 'Deluxe', capacity: 2, baseRateCentavos: 250_000 } });
    users = {};
    for (const name of ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST', 'OTHER_GUEST']) {
      const role = name === 'OTHER_GUEST' ? await prisma.role.findUniqueOrThrow({ where: { name: 'GUEST' } })
        : await prisma.role.create({ data: { name } });
      users[name] = (await prisma.user.create({ data: { roleId: role.id, name: 'Test', email: `${name}@example.test`, passwordHash: 'test-only', status: 'ACTIVE' } })).id;
    }
    for (const role of ['GUEST', 'OTHER_GUEST']) {
      const guest = await prisma.guest.create({ data: { userId: users[role], firstName: 'Test', lastName: 'Guest' } });
      const booking = await prisma.reservation.create({ data: { reservationNumber: `NX-${randomUUID()}`, guestId: guest.id,
        roomTypeId: type.id, status: 'CONFIRMED', checkInDate: todayInPhilippines(),
        checkOutDate: new Date(todayInPhilippines().getTime() + 3 * 86_400_000),
        guestCount: 2, nightlyRateCentavos: 250_000, totalAmountCentavos: 750_000 } });
      if (role === 'GUEST') bookingId = booking.id; else otherId = booking.id;
    }
    const token = randomBytes(32).toString('hex');
    await prisma.reservationAccessSession.create({ data: { reservationId: bookingId,
      tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60_000) } });
    cookie = `${BOOKING_COOKIE}=${token}`;
    const module = await Test.createTestingModule({
      imports: [ReservationsModule, PassportModule,
        JwtModule.register({ secret, signOptions: { algorithm: 'HS256', issuer: 'nexora-api', audience: 'nexora-web', expiresIn: '5m' } }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
      providers: [JwtStrategy, { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
    }).overrideProvider(PrismaService).useValue(prisma).overrideProvider(PaymongoAdapter).useValue(provider).compile();
    jwt = module.get(JwtService);
    checkout = module.get(CheckoutService);
    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    await prisma?.$disconnect();
    vi.unstubAllEnvs();
    const root = resolve(process.cwd());
    if (directory && directory.startsWith(resolve(root, '.phase7-webhook-')) && resolve(directory, '..') === root) rmSync(directory, { recursive: true, force: true });
  });


  function eventFor(paymentId: string, eventId = 'evt_test_paid') {
    return { data: { id: eventId, type: 'event', attributes: {
      type: 'checkout_session.payment.paid', livemode: false, created_at: Math.floor(Date.now() / 1000),
      data: { id: 'cs_test_session', type: 'checkout_session', attributes: {
        reference_number: paymentId,
        billing: { email: 'PRIVATE_PAYLOAD_BILLING' },
        payments: [{ id: 'pay_test_receipt', type: 'payment', attributes: {
          status: 'paid', amount: 750_000, currency: 'PHP', fee: 15_000, net_amount: 735_000,
        } }],
      } },
    } } };
  }
  function signature(raw: string, timestamp = Math.floor(Date.now() / 1000), key = webhookSecret) {
    return 't=' + timestamp + ',te=' + createHmac('sha256', key).update(timestamp + '.' + raw).digest('hex') + ',li=';
  }
  function deliver(event: ReturnType<typeof eventFor>, timestamp?: number) {
    const raw = JSON.stringify(event);
    return request(app.getHttpServer()).post('/api/webhooks/paymongo')
      .set('Content-Type', 'application/json').set('Paymongo-Signature', signature(raw, timestamp)).send(raw);
  }
  async function attempt() {
    await start().expect(200);
    return prisma.payment.findFirstOrThrow();
  }
  function summary() {
    return request(app.getHttpServer()).get('/api/reservations/access/payment-summary').set('Cookie', cookie);
  }

  it('verifies raw bytes without browser identity, records gross money once and exposes a safe summary', async () => {
    const payment = await attempt();
    const raw = JSON.stringify(eventFor(payment.id), null, 2) + '\n';
    const result = await request(app.getHttpServer()).post('/api/webhooks/paymongo')
      .set('Content-Type', 'application/json').set('Paymongo-Signature', signature(raw)).send(raw).expect(200);
    expect(result.body.data.outcome).toBe('PROCESSED');
    expect(result.headers['cache-control']).toBe('no-store');
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({
      status: 'PAID', providerPaymentId: 'pay_test_receipt', amountCentavos: 750_000, checkoutUrl: null,
    });
    expect((await summary().expect(200)).body.data).toMatchObject({ status: 'PAID', netPaidCentavos: 750_000, balanceDueCentavos: 0 });
    expect((await request(app.getHttpServer()).get(path()).set('Authorization', bearer()).expect(200)).body.data.state).toBe('PAID');
    expect(await prisma.$transaction((tx) => requireFullRecordedPayment(tx, bookingId, 750_000, new Date()))).toBe(750_000);
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe('CONFIRMED');
    const stored = JSON.stringify([await prisma.paymentEvent.findMany(), await prisma.auditLog.findMany()]);
    expect(stored).not.toContain('PRIVATE_PAYLOAD_BILLING');
    expect(stored).not.toContain(webhookSecret);
    expect(stored).not.toContain('checkout.paymongo.com');
  });
  it('retains route authorization on normal payment reads', async () => {
    await request(app.getHttpServer()).get(path()).expect(401);
    await request(app.getHttpServer()).get('/api/payments/reservations/' + otherId + '/summary')
      .set('Authorization', bearer('GUEST')).expect(404);
  });
  it('rejects missing, wrong, duplicate, live-only and tampered signatures without a journal', async () => {
    const raw = JSON.stringify(eventFor('not-a-payment'));
    for (const header of ['', signature(raw, undefined, 'wrong-secret'), signature(raw) + ',te=' + 'a'.repeat(64),
      't=1,te=,li=' + 'a'.repeat(64), signature(raw + ' ')]) {
      await request(app.getHttpServer()).post('/api/webhooks/paymongo').set('Content-Type', 'application/json')
        .set('Paymongo-Signature', header).send(raw).expect(401);
    }
    expect(await prisma.paymentEvent.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });
  it('rejects signed live envelopes and fails closed if the signing secret is absent', async () => {
    const event = eventFor('not-a-payment');
    event.data.attributes.livemode = true;
    await deliver(event).expect(400);
    vi.stubEnv('PAYMONGO_TEST_WEBHOOK_SECRET', '');
    await deliver(eventFor('not-a-payment')).expect(503);
    expect(await prisma.paymentEvent.count()).toBe(0);
  });
  it('journals signed stale deliveries for review without recording payment', async () => {
    const payment = await attempt();
    expect((await deliver(eventFor(payment.id), Math.floor(Date.now() / 1000) - 301).expect(200)).body.data.outcome).toBe('REVIEW_REQUIRED');
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('PENDING');
    expect((await summary().expect(200)).body.data.requiresReview).toBe(true);
    expect((await prisma.paymentEvent.findFirstOrThrow()).errorMessage).toBe('STALE_DELIVERY');
  });
  it('ignores unsupported authentic events without changing a receipt', async () => {
    const payment = await attempt();
    const event = eventFor(payment.id);
    event.data.attributes.type = 'payment.failed';
    expect((await deliver(event).expect(200)).body.data.outcome).toBe('IGNORED');
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('PENDING');
    expect((await prisma.paymentEvent.findFirstOrThrow()).status).toBe('IGNORED');
  });
  for (const problem of ['amount', 'currency', 'session', 'unknown-reference', 'two-paid', 'no-paid', 'missing-claim'] as const) {
    it('retains a signed ' + problem + ' mismatch without marking the attempt paid', async () => {
      const payment = await attempt();
      const event = eventFor(payment.id);
      const session = event.data.attributes.data;
      if (problem === 'amount') session.attributes.payments[0].attributes.amount = 1;
      if (problem === 'currency') session.attributes.payments[0].attributes.currency = 'USD';
      if (problem === 'session') session.id = 'cs_unrelated';
      if (problem === 'unknown-reference') session.attributes.reference_number = 'unknown';
      if (problem === 'two-paid') session.attributes.payments.push({ ...session.attributes.payments[0], id: 'pay_other' });
      if (problem === 'no-paid') session.attributes.payments = [];
      if (problem === 'missing-claim') await prisma.payment.update({ where: { id: payment.id }, data: { checkoutRequestKeyHash: null } });
      expect((await deliver(event).expect(200)).body.data.outcome).toBe('REVIEW_REQUIRED');
      expect((await prisma.payment.findFirstOrThrow()).status).toBe('PENDING');
      expect((await prisma.paymentEvent.findFirstOrThrow()).status).toBe('FAILED');
    });
  }
  it('prevents a provider payment identifier from being associated with two attempts', async () => {
    const payment = await attempt();
    await prisma.payment.create({ data: { reservationId: otherId, method: 'PAYMONGO', status: 'PENDING',
      amountCentavos: 750_000, providerPaymentId: 'pay_test_receipt' } });
    expect((await deliver(eventFor(payment.id)).expect(200)).body.data.outcome).toBe('REVIEW_REQUIRED');
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
  });
  for (const status of ['CANCELLED', 'EXPIRED', 'CHECKED_IN', 'CHECKED_OUT'] as const) {
    it('records genuine capture on a ' + status + ' booking without reviving or transitioning it', async () => {
      const payment = await attempt();
      await prisma.reservation.update({ where: { id: bookingId }, data: { status } });
      expect((await deliver(eventFor(payment.id)).expect(200)).body.data.outcome).toBe('REVIEW_REQUIRED');
      expect((await prisma.payment.findFirstOrThrow()).status).toBe('PAID');
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe(status);
      expect((await summary().expect(200)).body.data.requiresReview).toBe(true);
      await expect(prisma.$transaction((tx) => requireFullRecordedPayment(tx, bookingId, 750_000, new Date()))).rejects.toThrow('Full recorded payment');
    });
  }
  it('flags a capture received after the stay dates ended', async () => {
    const payment = await attempt();
    await prisma.reservation.update({ where: { id: bookingId }, data: { checkOutDate: todayInPhilippines() } });
    await deliver(eventFor(payment.id)).expect(200);
    expect((await summary().expect(200)).body.data.requiresReview).toBe(true);
  });
  it('counts a paid receipt once across duplicate deliveries and different event IDs', async () => {
    const payment = await attempt();
    const event = eventFor(payment.id);
    await deliver(event).expect(200);
    const paidAt = (await prisma.payment.findFirstOrThrow()).paidAt;
    expect((await deliver(event).expect(200)).body.data.outcome).toBe('DUPLICATE');
    event.data.id = 'evt_second_delivery';
    expect((await deliver(event).expect(200)).body.data.outcome).toBe('DUPLICATE');
    expect((await prisma.payment.findFirstOrThrow()).paidAt).toEqual(paidAt);
    expect(await prisma.auditLog.count({ where: { action: 'payment.paid' } })).toBe(1);
    expect(await prisma.paymentEvent.count()).toBe(2);
    expect((await summary().expect(200)).body.data.netPaidCentavos).toBe(750_000);
  });
  it('retains the original proof but blocks eligibility when an event ID conflicts', async () => {
    const payment = await attempt();
    const event = eventFor(payment.id);
    await deliver(event).expect(200);
    event.data.attributes.data.attributes.payments[0].attributes.amount = 1;
    expect((await deliver(event).expect(200)).body.data.outcome).toBe('REVIEW_REQUIRED');
    expect(await prisma.paymentEvent.count()).toBe(1);
    expect((await summary().expect(200)).body.data).toMatchObject({ netPaidCentavos: 750_000, requiresReview: true });
  });
  it('rolls back payment, proof and audit together and permits provider retry', async () => {
    const payment = await attempt();
    await prisma.$executeRawUnsafe("CREATE TRIGGER reject_paid BEFORE INSERT ON AuditLog WHEN NEW.action = 'payment.paid' BEGIN SELECT RAISE(ABORT, 'test-only failure'); END");
    await deliver(eventFor(payment.id)).expect(503);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('PENDING');
    expect(await prisma.paymentEvent.count()).toBe(0);
    await prisma.$executeRawUnsafe('DROP TRIGGER reject_paid');
    await deliver(eventFor(payment.id)).expect(200);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('PAID');
  });
  it('serializes duplicate events through independently connected database clients', async () => {
    const payment = await attempt();
    const other = otherClient();
    const service = new PaymongoWebhookService(other as PrismaService);
    const raw = JSON.stringify(eventFor(payment.id));
    try {
      const outcomes = await Promise.all([
        app.get(PaymongoWebhookService).handle(Buffer.from(raw), signature(raw)),
        service.handle(Buffer.from(raw), signature(raw)),
      ]);
      expect(outcomes.map((row) => row.outcome).sort()).toEqual(['DUPLICATE', 'PROCESSED']);
      expect(await prisma.paymentEvent.count()).toBe(1);
      expect(await prisma.auditLog.count({ where: { action: 'payment.paid' } })).toBe(1);
    } finally { await other.$disconnect(); }
  });
  it('preserves an early verified webhook when checkout creation returns afterwards', async () => {
    provider.create.mockImplementation(async ({ paymentId }: { paymentId: string }) => {
      await deliver(eventFor(paymentId)).expect(200);
      return { id: 'cs_test_session', url: 'https://checkout.paymongo.com/test-session' };
    });
    const result = await checkout.startForUser(bookingId, randomUUID(), { id: users.MANAGER, email: 'test@example.test', role: 'MANAGER' });
    expect(result.state).toBe('PAID');
    expect(result.checkoutUrl).toBeNull();
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('PAID');
    expect(await prisma.auditLog.count({ where: { action: 'payment.checkout.ready' } })).toBe(0);
  });
  it('does not count a database status without matching processed evidence', async () => {
    const payment = await attempt();
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date(), providerPaymentId: 'pay_test_receipt' } });
    await summary().expect(409);
    await expect(prisma.$transaction((tx) => requireFullRecordedPayment(tx, bookingId, 750_000, new Date()))).rejects.toThrow('financial review');
  });
});
