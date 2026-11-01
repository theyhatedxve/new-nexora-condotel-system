import 'reflect-metadata';
import { CheckoutService } from './checkout.service.js';
import { PaymongoAdapter } from './paymongo.adapter.js';
import { OwnershipService } from '../common/ownership/ownership.service.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
const privatePath = '/api/reservations/access/checkout';
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

describe('Step 7.2 — duplicate-safe test checkout', () => {
  beforeEach(async () => {
    vi.stubEnv('JWT_ACCESS_SECRET', secret);
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', 'http://localhost:5173');
    vi.stubEnv('PAYMONGO_TEST_SECRET_KEY', 'sk_test_fixture_only');
    vi.stubEnv('PAYMONGO_RETURN_URL', 'http://localhost:5173/payment-return');
    vi.stubEnv('PAYMONGO_PAYMENT_METHODS', 'qrph');
    const realAdapter = new PaymongoAdapter();
    provider = { settings: () => realAdapter.settings(), create: vi.fn().mockResolvedValue({
      id: 'cs_test_session', url: 'https://checkout.paymongo.com/test-session',
    }) };
    directory = mkdtempSync(resolve(process.cwd(), '.phase7-checkout-'));
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
    app = module.createNestApplication();
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
    if (directory && directory.startsWith(resolve(root, '.phase7-checkout-')) && resolve(directory, '..') === root) rmSync(directory, { recursive: true, force: true });
  });


  for (const role of ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST']) {
    it(`allows an authorized ${role} without marking the booking paid`, async () => {
      const result = await start(randomUUID(), role).expect(200);
      expect(result.body.data).toEqual({ state: 'READY', amountCentavos: 750_000,
        checkoutUrl: 'https://checkout.paymongo.com/test-session' });
      expect(result.headers['cache-control']).toBe('no-store');
      const payment = await prisma.payment.findFirstOrThrow();
      expect(payment.status).toBe('PENDING');
      expect(payment.paidAt).toBeNull();
      expect(payment.checkoutState).toBe('READY');
      expect(payment.checkoutRequestKeyHash).toHaveLength(64);
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe('CONFIRMED');
      expect(provider.create).toHaveBeenCalledTimes(1);
      expect(await prisma.auditLog.count()).toBe(2);
    });
  }
  it('calculates the remaining balance from stored completed receipts', async () => {
    await prisma.payment.create({ data: { reservationId: bookingId, method: 'PAY_AT_PROPERTY', status: 'PAID',
      amountCentavos: 250_000, paidAt: new Date(Date.now() - 1000) } });
    expect((await start()).body.data.amountCentavos).toBe(500_000);
    expect(provider.create.mock.calls[0][0].amountCentavos).toBe(500_000);
  });
  it('scopes cookie checkout to its session and ignores a different booking in the query', async () => {
    await request(app.getHttpServer()).post(`${privatePath}?reservationId=${otherId}`)
      .set('Origin', 'http://localhost:5173').set('Cookie', cookie).send({ requestId: randomUUID() }).expect(200);
    expect((await prisma.payment.findFirstOrThrow()).reservationId).toBe(bookingId);
    await request(app.getHttpServer()).get(privatePath).set('Cookie', cookie).expect(200);
  });
  it('rejects missing identity, another guest, missing cookies and unapproved origins', async () => {
    await request(app.getHttpServer()).post(path()).send({ requestId: randomUUID() }).expect(401);
    await start(randomUUID(), 'OTHER_GUEST').expect(404);
    await request(app.getHttpServer()).post(privatePath).set('Origin', 'http://localhost:5173')
      .send({ requestId: randomUUID() }).expect(404);
    await request(app.getHttpServer()).post(path()).set('Authorization', bearer())
      .set('Origin', 'https://evil.example').send({ requestId: randomUUID() }).expect(403);
    expect(provider.create).not.toHaveBeenCalled();
    expect(await prisma.payment.count()).toBe(0);
  });
  it('rejects invalid request IDs and client-controlled amounts or redirect URLs', async () => {
    for (const body of [{ requestId: 'bad' }, { requestId: randomUUID(), amountCentavos: 1 },
      { requestId: randomUUID(), currency: 'USD' }, { requestId: randomUUID(), returnUrl: 'https://evil.example' }]) {
      await request(app.getHttpServer()).post(path()).set('Authorization', bearer())
        .set('Origin', 'http://localhost:5173').send(body).expect(400);
    }
    expect(provider.create).not.toHaveBeenCalled();
  });
  it('reuses the same request and blocks a new request while allowing the existing link to be retrieved', async () => {
    const id = randomUUID();
    const first = await start(id).expect(200);
    expect((await start(id).expect(200)).body).toEqual(first.body);
    await start().expect(409);
    expect((await request(app.getHttpServer()).get(path()).set('Authorization', bearer()).expect(200)).body).toEqual(first.body);
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.count()).toBe(1);
    expect(await prisma.auditLog.count()).toBe(2);
  });
  it('rejects a request identifier reused for a different booking', async () => {
    const id = randomUUID();
    await start(id).expect(200);
    await request(app.getHttpServer()).post(`/api/payments/reservations/${otherId}/checkout`)
      .set('Authorization', bearer()).set('Origin', 'http://localhost:5173').send({ requestId: id }).expect(409);
    expect(provider.create).toHaveBeenCalledTimes(1);
  });
  it('does not resume a stale payment amount after the ledger changes', async () => {
    const id = randomUUID();
    await start(id).expect(200);
    await prisma.payment.create({ data: { reservationId: bookingId, method: 'PAY_AT_PROPERTY', status: 'PAID',
      amountCentavos: 250_000, paidAt: new Date(Date.now() - 1000) } });
    await start(id).expect(409);
    await request(app.getHttpServer()).get(path()).set('Authorization', bearer()).expect(409);
    expect(provider.create).toHaveBeenCalledTimes(1);
  });
  it('preserves an unknown result and never blindly creates another provider session', async () => {
    provider.create.mockRejectedValue(new Error('synthetic timeout'));
    const id = randomUUID();
    const result = await start(id).expect(200);
    expect(result.body.data.state).toBe('UNKNOWN');
    expect(result.body.data.checkoutUrl).toBeNull();
    expect((await start(id).expect(200)).body.data.state).toBe('UNKNOWN');
    await start().expect(409);
    expect(provider.create).toHaveBeenCalledTimes(1);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('PENDING');
  });
  it('keeps the provider session reference for review when final audit persistence fails', async () => {
    await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_checkout_ready BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'payment.checkout.ready' BEGIN SELECT RAISE(ABORT, 'test-only failure'); END`);
    expect((await start()).body.data.state).toBe('UNKNOWN');
    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment.checkoutState).toBe('UNKNOWN');
    expect(payment.providerCheckoutId).toBe('cs_test_session');
    expect(payment.checkoutUrl).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: 'payment.checkout.ready' } })).toBe(0);
  });
  it('does not contact the provider if the initial claim transaction rolls back', async () => {
    await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_checkout_claim BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'payment.checkout.requested' BEGIN SELECT RAISE(ABORT, 'test-only failure'); END`);
    await expect(checkout.startForUser(bookingId, randomUUID(), { id: users.MANAGER, email: 'test@example.test', role: 'MANAGER' })).rejects.toThrow();
    expect(provider.create).not.toHaveBeenCalled();
    expect(await prisma.payment.count()).toBe(0);
  });
  it('rejects live credentials before reserving a payment attempt', async () => {
    vi.stubEnv('PAYMONGO_TEST_SECRET_KEY', 'sk_live_not_allowed');
    await start().expect(503);
    expect(await prisma.payment.count()).toBe(0);
    expect(provider.create).not.toHaveBeenCalled();
  });
  for (const status of ['PENDING', 'CANCELLED', 'EXPIRED', 'CHECKED_IN', 'CHECKED_OUT'] as const) {
    it(`rejects checkout from ${status}`, async () => {
      await prisma.reservation.update({ where: { id: bookingId }, data: { status } });
      await start().expect(409);
      expect(provider.create).not.toHaveBeenCalled();
    });
  }
  it('rejects ended and fully paid bookings', async () => {
    await prisma.reservation.update({ where: { id: bookingId }, data: { checkOutDate: todayInPhilippines() } });
    await start().expect(409);
    await prisma.reservation.update({ where: { id: bookingId }, data: { checkOutDate: new Date(Date.now() + 3 * 86_400_000) } });
    await prisma.payment.create({ data: { reservationId: bookingId, method: 'PAY_AT_PROPERTY', status: 'PAID',
      amountCentavos: 750_000, paidAt: new Date(Date.now() - 1000) } });
    await start().expect(409);
    expect(provider.create).not.toHaveBeenCalled();
  });
  for (const sameKey of [true, false]) {
    it(`serializes independent clients while the provider call is pending (same key: ${sameKey})`, async () => {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => { release = resolve; });
      provider.create.mockImplementation(async () => { await wait; return {
        id: 'cs_test_session', url: 'https://checkout.paymongo.com/test-session',
      }; });
      const other = otherClient();
      const second = new CheckoutService(other as PrismaService, new OwnershipService(other as PrismaService), provider as PaymongoAdapter);
      const actor = { id: users.MANAGER, email: 'test@example.test', role: 'MANAGER' };
      const id = randomUUID();
      const first = checkout.startForUser(bookingId, id, actor);
      try {
        await vi.waitFor(() => expect(provider.create).toHaveBeenCalledTimes(1));
        if (sameKey) {
          expect((await second.startForUser(bookingId, id, actor)).state).toBe('CREATING');
        } else {
          await expect(second.startForUser(bookingId, randomUUID(), actor)).rejects.toThrow('existing attempt');
        }
        // A separate writer can commit while the provider is waiting: no network call holds the DB lock.
        await other.property.updateMany({ data: { city: 'Test updated' } });
        release();
        expect((await first).state).toBe('READY');
        expect(await prisma.payment.count()).toBe(1);
        expect(provider.create).toHaveBeenCalledTimes(1);
      } finally { release(); await first.catch(() => undefined); await other.$disconnect(); }
    });
  }
});
