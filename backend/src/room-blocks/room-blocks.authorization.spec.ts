
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

import { RoomBlocksController } from './room-blocks.controller.js';
import { RoomBlocksService } from './room-blocks.service.js';
import { RoomStatusController } from '../rooms/room-status.controller.js';
import { RoomStatusService } from '../rooms/room-status.service.js';

@Injectable()
class TestIdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];

    if (!role) return false;

    req.user = {
      id: 'isolated-test-user',
      role,
    };

    return true;
  }
}

describe('Phase 4 Step 6 — HTTP authorization', () => {
  let app: INestApplication;

  const blockService = {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'block-1' })),
    update: vi.fn(async () => ({ id: 'block-1' })),
    cancel: vi.fn(async () => ({
      id: 'block-1',
      canceledAt: new Date(),
    })),
  };

  const statusService = {
    update: vi.fn(async () => ({
      id: 'room-1',
      status: 'CLEANING',
    })),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        RoomBlocksController,
        RoomStatusController,
      ],
      providers: [
        Reflector,
        { provide: RoomBlocksService, useValue: blockService },
        { provide: RoomStatusService, useValue: statusService },
        { provide: APP_GUARD, useClass: TestIdentityGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
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

  it('rejects unauthenticated room block access', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/rooms/room-1/blocks');

    expect(res.status).toBe(403);
  });

  for (const role of ['ADMIN', 'MANAGER', 'RECEPTIONIST']) {
    it(`allows ${role} to list blocks`, async () => {
      const res = await request(app.getHttpServer())
        .get('/api/rooms/room-1/blocks')
        .set('x-test-role', role);

      expect(res.status).toBe(200);
    });
  }

  for (const role of ['ADMIN', 'MANAGER']) {
    it(`allows ${role} to create blocks`, async () => {
      const res = await request(app.getHttpServer())
        .post('/api/rooms/room-1/blocks')
        .set('x-test-role', role)
        .send({
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          reason: 'Maintenance',
        });

      expect(res.status).toBe(201);
    });
  }

  for (const role of ['RECEPTIONIST', 'GUEST']) {
    it(`rejects ${role} block creation`, async () => {
      const res = await request(app.getHttpServer())
        .post('/api/rooms/room-1/blocks')
        .set('x-test-role', role)
        .send({
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          reason: 'Maintenance',
        });

      expect(res.status).toBe(403);
    });
  }

  it('rejects GUEST operational status updates', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/rooms/room-1/status')
      .set('x-test-role', 'GUEST')
      .send({ status: 'CLEANING' });

    expect(res.status).toBe(403);
  });

  it('allows receptionist status route access', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/rooms/room-1/status')
      .set('x-test-role', 'RECEPTIONIST')
      .send({ status: 'CLEANING' });

    expect(res.status).toBe(200);
  });

  it('rejects OCCUPIED as a manual status', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/rooms/room-1/status')
      .set('x-test-role', 'ADMIN')
      .send({ status: 'OCCUPIED' });

    expect(res.status).toBe(400);
  });

  it('rejects unauthorized block fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/rooms/room-1/blocks')
      .set('x-test-role', 'ADMIN')
      .send({
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        reason: 'Maintenance',
        canceledAt: '2026-11-01',
      });

    expect(res.status).toBe(400);
  });

  it('allows manager to cancel a block', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/rooms/room-1/blocks/block-1/cancel')
      .set('x-test-role', 'MANAGER');

    expect(res.status).toBe(201);
  });
});
