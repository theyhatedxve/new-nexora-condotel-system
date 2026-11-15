import 'reflect-metadata';

import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { todayInPhilippines } from '../common/validation/philippine-date-range.js';
import { PaymongoAdapter } from '../payments/paymongo.adapter.js';
import { PaymongoCheckoutExpirationAdapter } from '../payments/paymongo-checkout-expiration.adapter.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReservationsModule } from './reservations.module.js';

const ORIGIN = 'http://localhost:5175';
const SECRET = 'synthetic-guest-http-secret-at-least-32-bytes';
const BASE_PATH = '/api/guest/reservations';
const PROPERTY_ID = 'guest-http-property';
const ROOM_TYPE_ID = 'guest-http-room-type';

let directory = '';
let prisma: PrismaService | undefined;
let app: INestApplication | undefined;

function http() {
  if (!app) {
    throw new Error('The test application is unavailable.');
  }
  return request(app.getHttpServer());
}

function database() {
  if (!prisma) {
    throw new Error('The test database is unavailable.');
  }
  return prisma;
}

function payload(
  paymentPreference: 'PAY_AT_PROPERTY' | 'PAYMONGO' = 'PAY_AT_PROPERTY',
) {
  const today = todayInPhilippines();
  return {
    requestId: randomUUID(),
    recoveryToken: randomBytes(32).toString('hex'),
    roomTypeId: ROOM_TYPE_ID,
    checkIn: new Date(today.getTime() + 10 * 86_400_000).toISOString().slice(0, 10),
    checkOut: new Date(today.getTime() + 11 * 86_400_000).toISOString().slice(0, 10),
    guests: 1,
    firstName: 'Submitted',
    lastName: 'Name',
    email: 'submitted@example.invalid',
    arrivalTime: '14:00',
    paymentPreference,
    acknowledgmentAccepted: true,
  };
}

async function account(roleName = 'GUEST') {
  const db = database();
  const role = await db.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });
  const user = await db.user.create({
    data: {
      roleId: role.id,
      name: 'Synthetic Account',
      email: `${randomUUID()}@example.invalid`,
      passwordHash: 'synthetic-unused-password-hash',
      status: 'ACTIVE',
      mustChangePassword: false,
      sessionVersion: 0,
    },
  });

  let guestId: string | null = null;
  if (roleName === 'GUEST') {
    const guest = await db.guest.create({
      data: {
        userId: user.id,
        firstName: 'Account',
        lastName: 'Owner',
        email: user.email,
      },
    });
    guestId = guest.id;
  }

  const token = new JwtService().sign(
    { sub: user.id, jti: randomUUID(), sv: user.sessionVersion },
    {
      secret: SECRET,
      algorithm: 'HS256',
      issuer: 'nexora-api',
      audience: 'nexora-web',
      expiresIn: '10m',
    },
  );
  return { user, guestId, token };
}

function createBooking(input: object, token: string) {
  return http()
    .post(BASE_PATH)
    .set('Authorization', `Bearer ${token}`)
    .set('Origin', ORIGIN)
    .send(input);
}

function recoverBooking(input: object, token: string) {
  return http()
    .post(`${BASE_PATH}/recover`)
    .set('Authorization', `Bearer ${token}`)
    .set('Origin', ORIGIN)
    .send(input);
}

beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AUTH_ALLOWED_ORIGINS', ORIGIN);
  vi.stubEnv('JWT_ACCESS_SECRET', SECRET);
  vi.stubEnv('NEXORA_BOOKING_DEADLINE_WORKER_ENABLED', 'false');

  directory = mkdtempSync(join(tmpdir(), 'nexora-guest-http-'));
  const databasePath = join(directory, 'guest-http.test.db');
  const fixture = new Database(databasePath);
  try {
    const migrationRoot = resolve(process.cwd(), 'prisma/migrations');
    const migrations = readdirSync(migrationRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const migration of migrations) {
      fixture.exec(readFileSync(join(migrationRoot, migration, 'migration.sql'), 'utf8'));
    }
  } finally {
    fixture.close();
  }

  vi.stubEnv(
    'NEXORA_RUNTIME_DATABASE_URL',
    `file:${databasePath.replaceAll('\\', '/')}`,
  );
  prisma = new PrismaService();
  await prisma.$connect();
  await prisma.property.create({
    data: {
      id: PROPERTY_ID,
      name: 'Synthetic HTTP property',
      address: 'Synthetic address',
      city: 'Test City',
      province: 'Test Province',
      country: 'Philippines',
    },
  });
  await prisma.roomType.create({
    data: {
      id: ROOM_TYPE_ID,
      propertyId: PROPERTY_ID,
      name: 'Synthetic HTTP room',
      capacity: 2,
      baseRateCentavos: 100000,
      isActive: true,
    },
  });
  await prisma.room.create({
    data: {
      roomTypeId: ROOM_TYPE_ID,
      roomNumber: 'HTTP-101',
      status: 'READY',
      isActive: true,
    },
  });

  const moduleRef = await Test.createTestingModule({
    imports: [
      ReservationsModule,
      PassportModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
    ],
    providers: [
      JwtStrategy,
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(PaymongoAdapter)
    .useValue({
      settings: vi.fn().mockReturnValue({
        secret: 'sk_test_synthetic_only',
        returnUrl: `${ORIGIN}/payment-return`,
        methods: ['qrph'],
      }),
      create: vi.fn().mockResolvedValue({
        id: 'cs_guest_http',
        url: 'https://checkout.paymongo.com/guest-http',
      }),
    })
    .overrideProvider(PaymongoCheckoutExpirationAdapter)
    .useValue({ close: vi.fn().mockResolvedValue('EXPIRED') })
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  await app.init();
});

afterEach(async () => {
  const target = directory ? resolve(directory) : '';

  const unsafeTarget = Boolean(
    target &&
    (
      !target.startsWith(resolve(tmpdir()) + sep) ||
      !basename(target).startsWith('nexora-guest-http-')
    ),
  );

  try {
    try {
      await app?.close();
    } finally {
      await prisma?.$disconnect();
    }
  } finally {
    app = undefined;
    prisma = undefined;
    vi.unstubAllEnvs();

    if (target && !unsafeTarget) {
      rmSync(target, {
        recursive: true,
        force: true,
      });
      directory = '';
    }
  }

  if (unsafeTarget) {
    throw new Error('Refusing unsafe fixture cleanup.');
  }
});

describe('authenticated guest booking HTTP API', () => {
  it('rejects anonymous creation', async () => {
    await http().post(BASE_PATH).set('Origin', ORIGIN).send(payload()).expect(401);
    expect(await database().reservation.count()).toBe(0);
  });

  it('rejects staff identities on guest creation', async () => {
    const staff = await account('ADMIN');
    await createBooking(payload(), staff.token).expect(403);
    expect(await database().reservation.count()).toBe(0);
  });

  it.each(['PAY_AT_PROPERTY', 'PAYMONGO'] as const)(
    'creates an account-owned pending %s booking',
    async (method) => {
      const owner = await account();
      const input = payload(method);
      const response = await createBooking(input, owner.token).expect(200);
      expect(response.body.data).toMatchObject({
        requestId: input.requestId,
        status: 'PENDING',
        paymentPreference: method,
        replayed: false,
      });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['set-cookie']).toBeUndefined();
      const stored = await database().reservation.findUniqueOrThrow({
        where: { reservationNumber: response.body.data.reservationNumber },
        include: { guest: true },
      });
      expect(stored.guestId).toBe(owner.guestId);
      expect(stored.guest.userId).toBe(owner.user.id);
      expect(stored.guest.firstName).toBe('Account');
      expect(stored.guest.email).toBe(owner.user.email);
      expect(await database().payment.count()).toBe(0);
      expect(await database().reservationAccessSession.count()).toBe(0);
    },
  );

  it('replays creation without another reservation or guest', async () => {
    const owner = await account();
    const input = payload();
    const first = await createBooking(input, owner.token).expect(200);
    const replay = await createBooking(input, owner.token).expect(200);
    expect(replay.body.data.reservationNumber).toBe(first.body.data.reservationNumber);
    expect(replay.body.data.replayed).toBe(true);
    expect(await database().reservation.count()).toBe(1);
    expect(await database().guest.count()).toBe(1);
  });

  it('rejects changing a previously submitted request', async () => {
    const owner = await account();
    const input = payload();
    await createBooking(input, owner.token).expect(200);
    await createBooking({ ...input, guests: 2 }, owner.token).expect(409);
    expect(await database().reservation.count()).toBe(1);
  });

  it('recovers the original request for its owner', async () => {
    const owner = await account();
    const input = payload();
    const created = await createBooking(input, owner.token).expect(200);
    const recovered = await recoverBooking({
      requestId: input.requestId,
      recoveryToken: input.recoveryToken,
    }, owner.token).expect(200);
    expect(recovered.body.data.reservationNumber).toBe(created.body.data.reservationNumber);
    expect(await database().reservation.count()).toBe(1);
  });

  it('rejects recovery by another account even with the proof', async () => {
    const owner = await account();
    const other = await account();
    const input = payload();
    await createBooking(input, owner.token).expect(200);
    await recoverBooking({
      requestId: input.requestId,
      recoveryToken: input.recoveryToken,
    }, other.token).expect(404);
  });

  it('rejects an incorrect recovery token', async () => {
    const owner = await account();
    const input = payload();
    await createBooking(input, owner.token).expect(200);
    await recoverBooking({
      requestId: input.requestId,
      recoveryToken: randomBytes(32).toString('hex'),
    }, owner.token).expect(404);
  });

  it('rejects a disallowed request origin', async () => {
    const owner = await account();
    await http()
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('Origin', 'https://untrusted.example.invalid')
      .send(payload())
      .expect(403);
    expect(await database().reservation.count()).toBe(0);
  });

  it('rejects accounts disabled after token issuance', async () => {
    const owner = await account();
    await database().user.update({
      where: { id: owner.user.id },
      data: { status: 'DISABLED' },
    });
    await createBooking(payload(), owner.token).expect(401);
  });

  it('hides another guest’s reservation details', async () => {
    const owner = await account();
    const other = await account();
    const created = await createBooking(payload(), owner.token).expect(200);
    const stored = await database().reservation.findUniqueOrThrow({
      where: { reservationNumber: created.body.data.reservationNumber },
    });
    await http()
      .get(`${BASE_PATH}/${stored.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    await http()
      .get(`${BASE_PATH}/${stored.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(404);
    const list = await http()
      .get(BASE_PATH)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(200);
    expect(list.body.data.items).toEqual([]);
    expect(list.body.data.total).toBe(0);
  });
});
