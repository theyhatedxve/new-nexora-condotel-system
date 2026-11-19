import { basename, isAbsolute, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Test, type TestingModule } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from './helpers/isolated-database.js';

describe('NEXORA backend smoke test', () => {
  let app: INestApplication<App> | undefined;
  let moduleFixture: TestingModule | undefined;
  let database: IsolatedTestDatabase | undefined;

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv(
      'JWT_ACCESS_SECRET',
      'nexora-isolated-e2e-secret-for-tests-only-2026',
    );
    vi.stubEnv(
      'AUTH_ALLOWED_ORIGINS',
      'http://localhost:5175,http://localhost:5176',
    );
    vi.stubEnv('NEXORA_BOOKING_DEADLINE_WORKER_ENABLED', 'false');
    vi.stubEnv('NEXORA_BOOKING_EMAIL_WORKER_ENABLED', 'false');

    database = await createIsolatedTestDatabase();

    // Import after setting the test environment because AuthModule
    // reads its JWT configuration during module evaluation.
    const { AppModule } = await import('../src/app.module.js');

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(database.prisma)
      .compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();
  }, 30_000);

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      } else {
        await moduleFixture?.close();
      }
    } finally {
      try {
        await database?.dispose();
      } finally {
        vi.unstubAllEnvs();
      }
    }
  }, 30_000);

  it('uses the isolated database instead of development data', async () => {
    if (!app || !database) {
      throw new Error('The isolated application was not initialized.');
    }

    const prisma = app.get<PrismaService>(PrismaService);

    expect(prisma).toBe(database.prisma);

    const databases = await prisma.$queryRawUnsafe<
      Array<{ name: string; file: string }>
    >('PRAGMA database_list');

    const main = databases.find((entry) => entry.name === 'main');

    expect(main).toBeDefined();

    if (!main) {
      throw new Error('The main SQLite database was not found.');
    }

    const databasePath = resolve(main.file);
    const temporaryRelativePath = relative(resolve(tmpdir()), databasePath);

    expect(basename(databasePath)).toBe('access.test.db');
    expect(temporaryRelativePath).not.toBe('');
    expect(temporaryRelativePath.startsWith('..')).toBe(false);
    expect(isAbsolute(temporaryRelativePath)).toBe(false);
  });

  it('returns the public health response', async () => {
    if (!app) {
      throw new Error('The application was not initialized.');
    }

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({
        status: 'ok',
        application: 'NEXORA Backend',
        message: 'The backend is running successfully.',
      });
  });

  it('rejects an unauthenticated request to a protected endpoint', async () => {
    if (!app) {
      throw new Error('The application was not initialized.');
    }

    await request(app.getHttpServer())
      .get('/api/auth-check')
      .expect(401);
  });
});