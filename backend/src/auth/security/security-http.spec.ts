
import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  Controller,
  Get,
  INestApplication,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { Request } from 'express';

import cookieParser from 'cookie-parser';
import request from 'supertest';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';

import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import { EmailService } from '../email.service.js';
import { getAllowedOrigins } from '../auth.config.js';

import { Roles } from '../../common/decorators/roles.decorator.js';

const databasePath = resolve(
  process.cwd(),
  'step8.security.test.db',
);

const developmentPath = resolve(
  process.cwd(),
  'dev.db',
);

const testEmail = `step8-${randomUUID()}@example.invalid`;
const testPassword = 'Strong-Step8-Password-2026!';

const sentEmails: Array<{
  email: string;
  token: string;
}> = [];

@Controller('security-test')
class SecurityTestController {
  @Get('authenticated')
  authenticated(@Req() req: Request) {
    return {
      authenticated: true,
      user: req.user,
    };
  }

  @Roles('MANAGER')
  @Get('manager')
  managerOnly() {
    return { allowed: true };
  }
}

describe('NEXORA Phase 3 Step 8 — HTTP security', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let origin: string;

  let testRefreshCookie = '';

  beforeAll(async () => {
    if (
      process.cwd().split(/[\\/]/).at(-1) !== 'backend'
    ) {
      throw new Error(
        'Run the tests from D:\\Web-JSX\\NEXORA\\backend.',
      );
    }

    if (!existsSync(databasePath)) {
      throw new Error(
        'Missing isolated Step 8 database.',
      );
    }

    if (
      existsSync(developmentPath) &&
      realpathSync(databasePath) ===
        realpathSync(developmentPath)
    ) {
      throw new Error(
        'Refusing to test against development database.',
      );
    }

    const allowedOrigins = getAllowedOrigins();
    origin = allowedOrigins[0];

    if (!origin) {
      throw new Error(
        'Configure AUTH_ALLOWED_ORIGINS before testing.',
      );
    }

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./step8.security.test.db',
    });

    prisma = new PrismaClient({ adapter });

    await prisma.$connect();

    const guestRole = await prisma.role.findUnique({
      where: { name: 'GUEST' },
    });

    if (!guestRole) {
      await prisma.role.create({
        data: { name: 'GUEST' },
      });
    }

    const fakeEmailService = {
      sendVerificationEmail: vi.fn(
        async (email: string, token: string) => {
          sentEmails.push({ email, token });
        },
      ),
    };

    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SecurityTestController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EmailService)
      .useValue(fakeEmailService)
      .compile();

    app = testingModule.createNestApplication();

    app.use(cookieParser());

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
    if (prisma) {
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
        select: { id: true },
      });

      if (user) {
        await prisma.emailVerificationToken.deleteMany({
          where: { userId: user.id },
        });

        await prisma.guest.deleteMany({
          where: { userId: user.id },
        });

        await prisma.refreshToken.deleteMany({
          where: { userId: user.id },
        });

        await prisma.user.delete({
          where: { id: user.id },
        });
      }
    }

    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('allows public health access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health');

    expect(response.status).toBe(200);
  });

  it('rejects unauthenticated protected access', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/security-test/authenticated');

    expect(response.status).toBe(401);
  });

  it('rejects an invalid JWT', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/security-test/authenticated')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });

  it('rejects unauthorized browser Origins', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', 'https://unapproved.example')
      .send({
        firstName: 'Step',
        lastName: 'Eight',
        email: testEmail,
        password: testPassword,
      });

    expect(response.status).toBe(403);
  });

  it('rejects public role escalation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({
        firstName: 'Step',
        lastName: 'Eight',
        email: testEmail,
        password: testPassword,
        role: 'ADMIN',
      });

    expect(response.status).toBe(400);
  });

  it('registers a PENDING guest without returning secrets', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set('Origin', origin)
      .send({
        firstName: 'Step',
        lastName: 'Eight',
        email: testEmail,
        password: testPassword,
      });

    expect(response.status).toBe(201);
    expect(response.body.accountStatus).toBe('PENDING');

    const body = JSON.stringify(response.body);

    expect(body).not.toContain(testPassword);
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('refreshToken');
    expect(body).not.toContain('accessToken');

    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { role: true },
    });

    expect(user?.status).toBe('PENDING');
    expect(user?.role.name).toBe('GUEST');

    expect(
      sentEmails.some((entry) => entry.email === testEmail),
    ).toBe(true);
  });

  it('does not allow a PENDING account to log in', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(response.status).toBe(401);
  });

  it('activates the account using its verification link', async () => {
    const email = sentEmails.find(
      (entry) => entry.email === testEmail,
    );

    expect(email).toBeDefined();

    const response = await request(app.getHttpServer())
      .get('/api/auth/verify-email')
      .query({ token: email!.token });

    expect(response.status).toBe(200);

    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    expect(user?.status).toBe('ACTIVE');
  });

  it('rejects a reused verification link', async () => {
    const email = sentEmails.find(
      (entry) => entry.email === testEmail,
    );

    const response = await request(app.getHttpServer())
      .get('/api/auth/verify-email')
      .query({ token: email!.token });

    expect(response.status).toBe(401);
  });

  it('logs in an ACTIVE guest and sets an HttpOnly cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(response.status).toBe(200);

    expect(response.body.data.accessToken).toEqual(
      expect.any(String),
    );

    const cookies = response.headers['set-cookie'];
    const allCookies = Array.isArray(cookies)
      ? cookies.join('; ')
      : String(cookies ?? '');

    expect(allCookies).toContain('nexora_refresh=');
    expect(allCookies).toContain('HttpOnly');
    expect(allCookies).toContain('SameSite=Strict');
    expect(allCookies).toContain('Path=/api/auth');

    const accessToken = response.body.data.accessToken;

    const firstCookie = Array.isArray(cookies)
    ? cookies[0]
    : String(cookies ?? '');

    testRefreshCookie = firstCookie.split(';')[0];

    const protectedResponse = await request(
      app.getHttpServer(),
    )
      .get('/api/security-test/authenticated')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(protectedResponse.status).toBe(200);
  });

  it('rejects GUEST access to a MANAGER-only route', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(login.status).toBe(200);

    const token = login.body.data.accessToken;

    const response = await request(app.getHttpServer())
      .get('/api/security-test/manager')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });


  it('rotates the refresh cookie and rejects token reuse', async () => {
    const agent = request(app.getHttpServer());

    const login = await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(login.status).toBe(200);

    const originalCookies = login.headers['set-cookie'];
    const originalCookie = (
      Array.isArray(originalCookies)
        ? originalCookies[0]
        : String(originalCookies)
    ).split(';')[0];

    const refreshed = await agent
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', originalCookie);

    expect(refreshed.status).toBe(200);

    const nextCookies = refreshed.headers['set-cookie'];
    const nextCookie = (
      Array.isArray(nextCookies)
        ? nextCookies[0]
        : String(nextCookies)
    ).split(';')[0];

    expect(nextCookie).not.toBe(originalCookie);

    const replay = await agent
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', originalCookie);

    expect(replay.status).toBe(401);

    // Reusing an old token revokes the whole family.
    const familyCheck = await agent
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', nextCookie);

    expect(familyCheck.status).toBe(401);
  });

  it('allows only one concurrent refresh attempt to succeed', async () => {
    const agent = request(app.getHttpServer());

    const login = await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(login.status).toBe(200);

    const setCookie = login.headers['set-cookie'];
    const cookie = (
      Array.isArray(setCookie)
        ? setCookie[0]
        : String(setCookie)
    ).split(';')[0];

    const results = await Promise.all([
      agent
        .post('/api/auth/refresh')
        .set('Origin', origin)
        .set('Cookie', cookie),

      agent
        .post('/api/auth/refresh')
        .set('Origin', origin)
        .set('Cookie', cookie),
    ]);

    const statuses = results
    .map((result) => result.status)
    .sort((a, b) => a - b);

    expect(statuses).toEqual([200, 401]);
  });

  it('rejects refresh requests from unapproved origins', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Origin', 'https://unapproved.example');

    expect(response.status).toBe(403);
  });

  
    it('logs out and clears the refresh cookie', async () => {
    // Use the earlier successful login session.
    // This avoids another request to the rate-limited login route.
    expect(testRefreshCookie).not.toBe('');

    const agent = request(app.getHttpServer());

    const logout = await agent
        .post('/api/auth/logout')
        .set('Origin', origin)
        .set('Cookie', testRefreshCookie);

    expect(logout.status).toBe(204);

    const clearedCookies = logout.headers['set-cookie'];

    const clearedCookie = Array.isArray(clearedCookies)
        ? clearedCookies.join('; ')
        : String(clearedCookies ?? '');

    expect(clearedCookie).toContain('nexora_refresh=');
    expect(clearedCookie).toContain('Path=/api/auth');

    const reuse = await agent
        .post('/api/auth/refresh')
        .set('Origin', origin)
        .set('Cookie', testRefreshCookie);

    expect(reuse.status).toBe(401);
    });


  it('rejects malformed verification tokens', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/verify-email')
      .query({ token: 'not-a-valid-token' });

    expect(response.status).toBe(400);
  });

  it('returns a generic response for an unknown resend address', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/resend-verification')
      .set('Origin', origin)
      .send({
        email: `unknown-${randomUUID()}@example.invalid`,
      });

    expect(response.status).toBe(200);

    expect(JSON.stringify(response.body)).not.toContain(
      'User not found',
    );
  });

});
