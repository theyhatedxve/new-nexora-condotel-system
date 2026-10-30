
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
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Injectable()
class TestIdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const role = request.headers['x-test-role'];

    if (!role) {
      return false;
    }

    request.user = {
      id: 'isolated-test-user',
      email: 'test@example.invalid',
      role,
    };

    return true;
  }
}

describe('Phase 4 Step 2 — HTTP role authorization', () => {
  let app: INestApplication;

  const service = {
    findAll: vi.fn(async () => []),
    findOne: vi.fn(async () => ({ id: 'room-1' })),
    create: vi.fn(async () => ({ id: 'room-1' })),
    update: vi.fn(async () => ({ id: 'room-1' })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        Reflector,
        {
          provide: RoomsService,
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
    if (app) {
      await app.close();
    }
  });

  it('rejects requests without test identity', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rooms');

    // TestIdentityGuard returns false.
    expect(response.status).toBe(403);
  });

  for (const role of ['ADMIN', 'MANAGER', 'RECEPTIONIST']) {
    it(`allows ${role} to read inventory`, async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rooms')
        .set('x-test-role', role);

      expect(response.status).toBe(200);
    });
  }

  for (const role of ['ADMIN', 'MANAGER']) {
    it(`allows ${role} to create rooms`, async () => {
      const response = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('x-test-role', role)
        .send({
          roomNumber: 'TEST-101',
          roomTypeId: 'test-room-type',
        });

      expect(response.status).toBe(201);
    });
  }

  for (const role of ['RECEPTIONIST', 'GUEST']) {
    it(`rejects ${role} room creation`, async () => {
      const response = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('x-test-role', role)
        .send({
          roomNumber: 'TEST-101',
          roomTypeId: 'test-room-type',
        });

      expect(response.status).toBe(403);
    });
  }

  it('rejects GUEST inventory access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rooms')
      .set('x-test-role', 'GUEST');

    expect(response.status).toBe(403);
  });

  it('rejects unexpected fields in room creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/rooms')
      .set('x-test-role', 'ADMIN')
      .send({
        roomNumber: 'TEST-101',
        roomTypeId: 'test-room-type',
        status: 'OCCUPIED',
      });

    expect(response.status).toBe(400);
  });
});
