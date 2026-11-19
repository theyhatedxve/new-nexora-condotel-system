import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BookingAccessController } from './booking-access.controller.js';

let app: INestApplication;

beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [BookingAccessController],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
});

afterEach(async () => {
  await app?.close();
});

describe('retired accountless booking access', () => {
  const endpoints = [
    'request',
    'exchange',
    'current',
    'logout',
    'checkout',
    'payment-summary',
  ];

  it.each(endpoints)(
    'rejects POST /reservations/access/%s',
    async (endpoint) => {
      const response = await request(app.getHttpServer())
        .post(`/api/reservations/access/${endpoint}`)
        .set('Cookie', `nexora_booking_access=${'a'.repeat(64)}`)
        .send({
          email: 'synthetic@example.invalid',
          reservationNumber: 'NX-synthetic',
          token: 'b'.repeat(64),
        })
        .expect(410);

      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.body.message).toContain('Sign in');
      expect(response.body.data).toBeUndefined();
    },
  );

  it.each(endpoints)(
    'rejects GET /reservations/access/%s',
    async (endpoint) => {
      const response = await request(app.getHttpServer())
        .get(`/api/reservations/access/${endpoint}`)
        .expect(410);

      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body.data).toBeUndefined();
    },
  );
});
