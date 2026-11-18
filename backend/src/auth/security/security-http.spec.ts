
import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

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

import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthService } from '../auth.service.js';
import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../../../test/helpers/isolated-database.js';

import { PrismaService } from '../../prisma/prisma.service.js';

import { EmailService } from '../email.service.js';

import { Roles } from '../../common/decorators/roles.decorator.js';



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
  let database: IsolatedTestDatabase | undefined;
  let sessionAuth: AuthService;
  let securityPasswordHash: string;

  let testRefreshCookie = '';

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv(
      'JWT_ACCESS_SECRET',
      'synthetic-http-security-secret-at-least-thirty-two-bytes',
    );
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', 'http://localhost:5175');
    vi.stubEnv('NEXORA_BOOKING_EMAIL_WORKER_ENABLED', 'false');
    vi.stubEnv('NEXORA_BOOKING_DEADLINE_WORKER_ENABLED', 'false');

    origin = 'http://localhost:5175';
    sentEmails.length = 0;
    database = await createIsolatedTestDatabase();
    prisma = database.prisma;
    await prisma.role.create({ data: { name: 'GUEST' } });

    const fakeEmailService = {
      sendVerificationEmail: vi.fn(
        async (email: string, token: string) => {
          sentEmails.push({ email, token });
        },
      ),
    };

    // AuthModule reads JWT settings when it is imported.
    const { AppModule } = await import('../../app.module.js');
    const { AuthService } = await import('../auth.service.js');
    const { PasswordService } = await import('../password.service.js');

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
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
    sessionAuth = app.get(AuthService);
    securityPasswordHash = await app.get(PasswordService)
      .hashPassword(testPassword);
  }, 60_000);

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      try {
        await database?.dispose();
      } finally {
        vi.unstubAllEnvs();
      }
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


  async function authenticatedGuest() {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: 'GUEST' },
    });
    const user = await prisma.user.create({
      data: {
        name: 'Synthetic security guest',
        email: 'session-' + randomUUID() + '@example.invalid',
        passwordHash: securityPasswordHash,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });
    await prisma.guest.create({
      data: { userId: user.id, firstName: 'Synthetic', lastName: 'Security' },
    });
    const session = await sessionAuth.login({
      email: user.email,
      password: testPassword,
    });
    return { user, session };
  }

  it('rejects an access token after the account session version changes', async () => {
    const { user, session } = await authenticatedGuest();
    await prisma.user.update({
      where: { id: user.id },
      data: { sessionVersion: { increment: 1 } },
    });
    const response = await request(app.getHttpServer())
      .get('/api/security-test/authenticated')
      .set('Authorization', 'Bearer ' + session.accessToken);
    expect(response.status).toBe(401);
  });

  it('rejects an access token after the account is disabled', async () => {
    const { user, session } = await authenticatedGuest();
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'DISABLED' },
    });
    const response = await request(app.getHttpServer())
      .get('/api/security-test/authenticated')
      .set('Authorization', 'Bearer ' + session.accessToken);
    expect(response.status).toBe(401);
  });

  it('rejects an ordinary access token when a password change becomes required', async () => {
    const { user, session } = await authenticatedGuest();
    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: true },
    });
    const response = await request(app.getHttpServer())
      .get('/api/security-test/authenticated')
      .set('Authorization', 'Bearer ' + session.accessToken);
    expect(response.status).toBe(401);
  });

  it('uses the current database role when authorizing an existing token', async () => {
    const { user, session } = await authenticatedGuest();
    const before = await request(app.getHttpServer())
      .get('/api/security-test/manager')
      .set('Authorization', 'Bearer ' + session.accessToken);
    expect(before.status).toBe(403);

    const managerRole = await prisma.role.upsert({
      where: { name: 'MANAGER' },
      update: {},
      create: { name: 'MANAGER' },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId: managerRole.id },
    });
    const after = await request(app.getHttpServer())
      .get('/api/security-test/manager')
      .set('Authorization', 'Bearer ' + session.accessToken);
    expect(after.status).toBe(200);
    expect(after.body).toEqual({ allowed: true });
  });

});
