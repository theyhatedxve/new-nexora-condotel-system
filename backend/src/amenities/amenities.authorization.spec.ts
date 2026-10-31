
import 'reflect-metadata';

import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';

import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { RolesGuard } from '../common/guards/roles.guard.js';

import { AmenitiesController } from './amenities.controller.js';
import { RoomTypeAmenitiesController } from './room-type-amenities.controller.js';
import { AmenitiesService } from './amenities.service.js';

@Injectable()
class TestIdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const role = req.headers['x-test-role'];

    if (role) {
      req.user = {
        id: 'isolated-test-user',
        email: 'test@example.invalid',
        role,
      };
    }

    // Let RolesGuard decide permissions.
    // Public endpoints work without test identity.
    return true;
  }
}

describe('Phase 4 Step 3 — HTTP authorization', () => {
  let app: INestApplication;

  const service = {
    findAll: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'amenity-1' })),
    update: vi.fn(async () => ({ id: 'amenity-1' })),
    findRoomTypeAmenities: vi.fn(async () => []),
    attach: vi.fn(async () => ({ id: 'amenity-1' })),
    detach: vi.fn(async () => undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AmenitiesController,
        RoomTypeAmenitiesController,
      ],
      providers: [
        Reflector,
        {
          provide: AmenitiesService,
          useValue: service,
        },
        {
          provide: APP_GUARD,
          useClass: TestIdentityGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();

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

  afterAll(async () => {
    if (app) await app.close();
  });

  it('allows public amenity listing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/amenities');

    expect(response.status).toBe(200);
  });

  it('allows public room-type amenity listing', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/room-types/test-type/amenities');

    expect(response.status).toBe(200);
  });

  it('rejects unauthenticated amenity creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/amenities')
      .send({ name: 'Wi-Fi' });

    expect(response.status).toBe(401);
  });

  for (const role of ['ADMIN', 'MANAGER']) {
    it(`allows ${role} to create amenities`, async () => {
      const response = await request(app.getHttpServer())
        .post('/api/amenities')
        .set('x-test-role', role)
        .send({ name: 'Wi-Fi' });

      expect(response.status).toBe(201);
    });

    it(`allows ${role} to attach amenities`, async () => {
      const response = await request(app.getHttpServer())
        .post('/api/room-types/test-type/amenities')
        .set('x-test-role', role)
        .send({ amenityId: 'amenity-1' });

      expect(response.status).toBe(201);
    });
  }

  for (const role of ['RECEPTIONIST', 'GUEST']) {
    it(`rejects ${role} amenity creation`, async () => {
      const response = await request(app.getHttpServer())
        .post('/api/amenities')
        .set('x-test-role', role)
        .send({ name: 'Wi-Fi' });

      expect(response.status).toBe(403);
    });

    it(`rejects ${role} amenity detachment`, async () => {
      const response = await request(app.getHttpServer())
        .delete(
          '/api/room-types/test-type/amenities/amenity-1',
        )
        .set('x-test-role', role);

      expect(response.status).toBe(403);
    });
  }

  it('rejects unexpected fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/amenities')
      .set('x-test-role', 'ADMIN')
      .send({
        name: 'Wi-Fi',
        isAdmin: true,
      });

    expect(response.status).toBe(400);
  });

  it('allows authorized detachment with HTTP 204', async () => {
    const response = await request(app.getHttpServer())
      .delete(
        '/api/room-types/test-type/amenities/amenity-1',
      )
      .set('x-test-role', 'MANAGER');

    expect(response.status).toBe(204);
  });
});
