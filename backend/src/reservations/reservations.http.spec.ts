import 'reflect-metadata';

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ReservationAcquisitionService } from './reservation-acquisition.service.js';
import { ReservationsController } from './reservations.controller.js';

const endpoint = '/api/reservations/pay-at-property';
const origin = 'http://localhost:5175';
let app: INestApplication | undefined;
const acquire = vi.fn();

function server() {
  if (!app) throw new Error('Test application is not initialized.');
  return app.getHttpServer();
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv('AUTH_ALLOWED_ORIGINS', origin);
  acquire.mockResolvedValue({
    reservationNumber: 'SYNTHETIC-LEGACY-BOOKING',
    status: 'CONFIRMED',
    nightlyRateCentavos: 100000,
    totalAmountCentavos: 100000,
  });

  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
    controllers: [ReservationsController],
    providers: [
      { provide: ReservationAcquisitionService, useValue: { acquire } },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
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

describe('retired legacy Pay at Property endpoint', () => {
  it('returns 410 without acquiring inventory or creating a booking', async () => {
    const response = await request(server())
      .post(endpoint)
      .set('Origin', origin)
      .send({
        roomTypeId: 'synthetic-room-type',
        checkIn: '2030-01-01',
        checkOut: '2030-01-02',
        guests: 1,
        firstName: 'Synthetic',
        lastName: 'Guest',
        email: 'legacy@example.invalid',
      })
      .expect(410);

    expect(response.body.statusCode).toBe(410);
    expect(response.body.data).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(acquire).not.toHaveBeenCalled();
  });

  it.each([undefined, 'https://unapproved.example.invalid'])(
    'remains retired for Origin %s', async (requestOrigin) => {
      const pending = request(server()).post(endpoint);
      if (requestOrigin) pending.set('Origin', requestOrigin);
      await pending.send({}).expect(410);
      expect(acquire).not.toHaveBeenCalled();
    },
  );

  it('cannot be revived by client-supplied status or credentials', async () => {
    await request(server())
      .post(endpoint)
      .set('Origin', origin)
      .send({
        status: 'CONFIRMED',
        paymentPreference: 'PAY_AT_PROPERTY',
        actorUserId: 'synthetic-admin',
      })
      .expect(410);
    expect(acquire).not.toHaveBeenCalled();
  });

  it('remains retired across repeated requests', async () => {
    for (let index = 0; index < 3; index += 1) {
      await request(server()).post(endpoint).set('Origin', origin).send({}).expect(410);
    }
    expect(acquire).not.toHaveBeenCalled();
  });
});
