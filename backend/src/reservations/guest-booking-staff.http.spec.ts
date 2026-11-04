import 'reflect-metadata';

import { randomBytes, randomUUID } from 'node:crypto';

import {
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';

import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import request from 'supertest';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { JwtStrategy } from '../auth/jwt.strategy.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

import {
  GuestBookingStaffController,
} from './guest-booking-staff.controller.js';

import {
  GuestBookingStaffService,
} from './guest-booking-staff.service.js';

const BASE =
  '/api/reservations/synthetic-reservation/guest-request';

const actions = [
  { name: 'contact', body: { channel: 'PHONE' } },
  { name: 'confirm', body: { guestAgreed: true } },
  {
    name: 'reject',
    body: { reason: 'Guest declined the request.' },
  },
] as const;

let app: INestApplication | undefined;
let jwt: JwtService;

const staff = {
  contact: vi.fn(),
  confirm: vi.fn(),
  reject: vi.fn(),
};

const findUser = vi.fn();

function server() {
  if (!app) {
    throw new Error('Test application is not initialized.');
  }

  return app.getHttpServer();
}

function token(userId = 'ADMIN') {
  return jwt.sign(
    {
      sub: userId,
      jti: randomUUID(),
      role: 'ADMIN',
    },
    {
      issuer: 'nexora-api',
      audience: 'nexora-web',
      algorithm: 'HS256',
      expiresIn: '5m',
    },
  );
}

function actor(role: string) {
  return {
    id: role,
    email: `${role.toLowerCase()}@example.invalid`,
    role,
  };
}

beforeEach(async () => {
  vi.resetAllMocks();

  const secret = randomBytes(48).toString('hex');
  vi.stubEnv('JWT_ACCESS_SECRET', secret);
  jwt = new JwtService({ secret });

  findUser.mockImplementation(
    async (input: { where: { id: string } }) => {
      const id = input.where.id;

      if (id === 'missing') return null;

      return {
        id,
        email: `${id.toLowerCase()}@example.invalid`,
        status: id === 'disabled' ? 'DISABLED' : 'ACTIVE',
        role: { name: id === 'disabled' ? 'ADMIN' : id },
      };
    },
  );

  const receipt = {
    id: 'synthetic-reservation',
    reservationNumber: 'SYNTHETIC-GUEST-REQUEST',
    status: 'PENDING',
    paymentPreference: 'PAY_AT_PROPERTY',
  };

  staff.contact.mockResolvedValue(receipt);
  staff.confirm.mockResolvedValue({ ...receipt, status: 'CONFIRMED' });
  staff.reject.mockResolvedValue({ ...receipt, status: 'CANCELLED' });

  const moduleRef = await Test.createTestingModule({
    imports: [
      PassportModule,
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
    ],
    controllers: [GuestBookingStaffController],
    providers: [
      JwtStrategy,
      {
        provide: PrismaService,
        useValue: { user: { findUnique: findUser } },
      },
      { provide: GuestBookingStaffService, useValue: staff },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
});

afterEach(async () => {
  try {
    await app?.close();
  } finally {
    app = undefined;
    vi.unstubAllEnvs();
  }
});

describe('guest booking staff HTTP actions', () => {
  it.each(actions)('requires authentication for $name', async ({ name, body }) => {
    await request(server()).post(`${BASE}/${name}`).send(body).expect(401);
    expect(staff[name]).not.toHaveBeenCalled();
  });

  it.each(actions)(
    'rejects a guest for $name even with an ADMIN token claim',
    async ({ name, body }) => {
      await request(server())
        .post(`${BASE}/${name}`)
        .auth(token('GUEST'), { type: 'bearer' })
        .send(body)
        .expect(403);
      expect(staff[name]).not.toHaveBeenCalled();
    },
  );

  it.each(['disabled', 'missing'])('rejects the %s account', async (userId) => {
    await request(server())
      .post(`${BASE}/contact`)
      .auth(token(userId), { type: 'bearer' })
      .send({ channel: 'PHONE' })
      .expect(401);
    expect(staff.contact).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'MANAGER', 'RECEPTIONIST'])(
    'permits all three actions for %s',
    async (role) => {
      for (const action of actions) {
        const response = await request(server())
          .post(`${BASE}/${action.name}`)
          .auth(token(role), { type: 'bearer' })
          .send(action.body)
          .expect(200);
        expect(response.headers['cache-control']).toBe('no-store');
      }

      expect(staff.contact).toHaveBeenCalledWith(
        actor(role), 'synthetic-reservation', 'PHONE',
      );
      expect(staff.confirm).toHaveBeenCalledWith(
        actor(role), 'synthetic-reservation', true,
      );
      expect(staff.reject).toHaveBeenCalledWith(
        actor(role), 'synthetic-reservation', 'Guest declined the request.',
      );
    },
  );

  it('accepts EMAIL contact', async () => {
    await request(server())
      .post(`${BASE}/contact`)
      .auth(token(), { type: 'bearer' })
      .send({ channel: 'EMAIL' })
      .expect(200);
    expect(staff.contact).toHaveBeenCalledWith(
      actor('ADMIN'), 'synthetic-reservation', 'EMAIL',
    );
  });

  it.each([
    { name: 'contact', body: {} },
    { name: 'contact', body: { channel: 'SMS' } },
    { name: 'contact', body: { channel: 'PHONE', actorUserId: 'other-user' } },
    { name: 'confirm', body: {} },
    { name: 'confirm', body: { guestAgreed: false } },
    { name: 'confirm', body: { guestAgreed: 'true' } },
    { name: 'confirm', body: { guestAgreed: true, role: 'ADMIN' } },
    { name: 'reject', body: {} },
    { name: 'reject', body: { reason: 'No' } },
    { name: 'reject', body: { reason: 'x'.repeat(501) } },
    { name: 'reject', body: { reason: 'Guest declined.', status: 'CONFIRMED' } },
  ])('rejects invalid $name input: $body', async ({ name, body }) => {
    await request(server())
      .post(`${BASE}/${name}`)
      .auth(token(), { type: 'bearer' })
      .send(body)
      .expect(400);
    expect(staff.contact).not.toHaveBeenCalled();
    expect(staff.confirm).not.toHaveBeenCalled();
    expect(staff.reject).not.toHaveBeenCalled();
  });

  it('returns the service receipt inside data', async () => {
    const response = await request(server())
      .post(`${BASE}/confirm`)
      .auth(token(), { type: 'bearer' })
      .send({ guestAgreed: true })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        id: 'synthetic-reservation',
        reservationNumber: 'SYNTHETIC-GUEST-REQUEST',
        status: 'CONFIRMED',
        paymentPreference: 'PAY_AT_PROPERTY',
      },
    });
  });

  it('preserves a service conflict without returning success', async () => {
    staff.confirm.mockRejectedValueOnce(
      new ConflictException('Record staff contact before confirming.'),
    );
    await request(server())
      .post(`${BASE}/confirm`)
      .auth(token(), { type: 'bearer' })
      .send({ guestAgreed: true })
      .expect(409);
  });
});
