
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

import {
  PublicRoomImageController,
  RoomImagesController,
} from './room-images.controller.js';

import { RoomImagesService } from './room-images.service.js';

@Injectable()
class TestIdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];

    if (role) {
      req.user = {
        id: 'test-user',
        email: 'test@example.invalid',
        role,
      };
    }

    return true;
  }
}

describe('Phase 4 Step 4 — Image HTTP permissions', () => {
  let app: INestApplication;

  const service = {
    list: vi.fn(async () => []),
    upload: vi.fn(async () => ({ id: 'image-1' })),
    update: vi.fn(async () => ({ id: 'image-1' })),
    remove: vi.fn(async () => undefined),
    readPublicImage: vi.fn(
      async () => Buffer.from('test image bytes'),
    ),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        RoomImagesController,
        PublicRoomImageController,
      ],
      providers: [
        Reflector,
        {
          provide: RoomImagesService,
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

  it('allows public gallery listing', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/room-types/test-type/images');

    expect(result.status).toBe(200);
  });

  it('allows controlled public image delivery', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/room-images/image-1/file');

    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toContain('image/webp');
    expect(result.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects unauthenticated uploads', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/room-types/test-type/images');

    expect(result.status).toBe(401);
  });

  for (const role of ['ADMIN', 'MANAGER']) {
    it(`allows ${role} to upload`, async () => {
      const result = await request(app.getHttpServer())
        .post('/api/room-types/test-type/images')
        .set('x-test-role', role)
        .attach('file', Buffer.from('test'), 'test.jpg');

      expect(result.status).toBe(201);
    });

    it(`allows ${role} to update metadata`, async () => {
      const result = await request(app.getHttpServer())
        .patch('/api/room-types/test-type/images/image-1')
        .set('x-test-role', role)
        .send({ displayOrder: 2 });

      expect(result.status).toBe(200);
    });
  }

  for (const role of ['GUEST', 'RECEPTIONIST']) {
    it(`rejects ${role} uploads`, async () => {
      const result = await request(app.getHttpServer())
        .post('/api/room-types/test-type/images')
        .set('x-test-role', role)
        .attach('file', Buffer.from('test'), 'test.jpg');

      expect(result.status).toBe(403);
    });

    it(`rejects ${role} image deletion`, async () => {
      const result = await request(app.getHttpServer())
        .delete('/api/room-types/test-type/images/image-1')
        .set('x-test-role', role);

      expect(result.status).toBe(403);
    });
  }

  it('rejects unauthorized metadata fields', async () => {
    const result = await request(app.getHttpServer())
      .patch('/api/room-types/test-type/images/image-1')
      .set('x-test-role', 'ADMIN')
      .send({ filePath: '../secret' });

    expect(result.status).toBe(400);
  });

  it('allows authorized image removal', async () => {
    const result = await request(app.getHttpServer())
      .delete('/api/room-types/test-type/images/image-1')
      .set('x-test-role', 'ADMIN');

    expect(result.status).toBe(204);
  });
});
