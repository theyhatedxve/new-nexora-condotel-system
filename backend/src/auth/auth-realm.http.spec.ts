import 'reflect-metadata';

import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
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

import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../../test/helpers/isolated-database.js';
import { AuthRealmController } from './auth-realm.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

const GUEST_ORIGIN = 'http://localhost:5175';
const STAFF_ORIGIN = 'http://localhost:5176';
const PASSWORD = 'Auth-Separation-Test-Password-2026!';

const GUEST_EMAIL = 'realm-guest@example.invalid';
const STAFF_EMAIL = 'realm-staff@example.invalid';

function responseCookie(
  response: { headers: Record<string, unknown> },
  name: string,
): string {
  const header = response.headers['set-cookie'];
  const values =
    typeof header === 'string'
      ? [header]
      : Array.isArray(header)
        ? header
        : [];

  const cookie = values.find(
    (value): value is string =>
      typeof value === 'string' &&
      value.startsWith(`${name}=`),
  );

  if (!cookie) {
    throw new Error(`Missing expected cookie: ${name}`);
  }

  return cookie.split(';')[0];
}

describe('Guest and staff authentication isolation', () => {
  let app: INestApplication | undefined;
  let database: IsolatedTestDatabase | undefined;

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv(
      'AUTH_ALLOWED_ORIGINS',
      `${GUEST_ORIGIN},${STAFF_ORIGIN}`,
    );
    vi.stubEnv('AUTH_GUEST_ALLOWED_ORIGINS', GUEST_ORIGIN);
    vi.stubEnv('AUTH_STAFF_ALLOWED_ORIGINS', STAFF_ORIGIN);

    database = await createIsolatedTestDatabase();

    const passwords = new PasswordService();
    const passwordHash = await passwords.hashPassword(PASSWORD);

    for (const account of [
      { role: 'GUEST', email: GUEST_EMAIL },
      { role: 'SUPER_ADMIN', email: STAFF_EMAIL },
    ]) {
      const role = await database.prisma.role.upsert({
        where: { name: account.role },
        update: {},
        create: { name: account.role },
      });

      await database.prisma.user.create({
        data: {
          name: `Test ${account.role}`,
          email: account.email,
          passwordHash,
          status: 'ACTIVE',
          roleId: role.id,
        },
      });
    }

    const authService = new AuthService(
      database.prisma as never,
      passwords,
      new JwtService({
        secret: 'isolated-auth-realm-test-secret-at-least-32-bytes',
        signOptions: {
          algorithm: 'HS256',
          expiresIn: 900,
          issuer: 'nexora-api',
          audience: 'nexora-web',
        },
      }),
    );

    const module = await Test.createTestingModule({
      controllers: [AuthRealmController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  }, 60_000);

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await database?.dispose();
      } finally {
        vi.unstubAllEnvs();
      }
    }
  });

  function server() {
    if (!app) throw new Error('Test application is unavailable.');
    return app.getHttpServer();
  }

  async function login(realm: 'guest' | 'staff') {
    return request(server())
      .post(`/api/auth/${realm}/login`)
      .set(
        'Origin',
        realm === 'guest' ? GUEST_ORIGIN : STAFF_ORIGIN,
      )
      .send({
        email: realm === 'guest' ? GUEST_EMAIL : STAFF_EMAIL,
        password: PASSWORD,
      })
      .expect(200);
  }

  it('issues separate cookies with separate paths', async () => {
    const guest = await login('guest');
    const staff = await login('staff');

    expect(guest.body.data.user.role).toBe('GUEST');
    expect(staff.body.data.user.role).toBe('SUPER_ADMIN');

    const guestHeaders = guest.headers['set-cookie'];
    const staffHeaders = staff.headers['set-cookie'];

    expect(JSON.stringify(guestHeaders)).toContain(
      'nexora_guest_refresh=',
    );
    expect(JSON.stringify(guestHeaders)).toContain(
      'Path=/api/auth/guest',
    );
    expect(JSON.stringify(staffHeaders)).toContain(
      'nexora_staff_refresh=',
    );
    expect(JSON.stringify(staffHeaders)).toContain(
      'Path=/api/auth/staff',
    );
    expect(JSON.stringify(guestHeaders)).toContain('HttpOnly');
    expect(JSON.stringify(staffHeaders)).toContain('SameSite=Strict');

    expect(guest.body.data.refreshToken).toBeUndefined();
    expect(staff.body.data.refreshToken).toBeUndefined();
  }, 30_000);

  it('preserves staff refresh after guest logout', async () => {
    const guest = await login('guest');
    const staff = await login('staff');

    const guestCookie = responseCookie(
      guest,
      'nexora_guest_refresh',
    );
    const staffCookie = responseCookie(
      staff,
      'nexora_staff_refresh',
    );

    // Deliberately send both; the route must select its own cookie.
    const bothCookies = `${guestCookie}; ${staffCookie}`;

    await request(server())
      .post('/api/auth/guest/logout')
      .set('Origin', GUEST_ORIGIN)
      .set('Cookie', bothCookies)
      .expect(204);

    await request(server())
      .post('/api/auth/guest/refresh')
      .set('Origin', GUEST_ORIGIN)
      .set('Cookie', guestCookie)
      .expect(401);

    await request(server())
      .post('/api/auth/staff/refresh')
      .set('Origin', STAFF_ORIGIN)
      .set('Cookie', staffCookie)
      .expect(200);
  }, 30_000);

  it('preserves guest refresh after staff logout', async () => {
    const guest = await login('guest');
    const staff = await login('staff');

    const guestCookie = responseCookie(
      guest,
      'nexora_guest_refresh',
    );
    const staffCookie = responseCookie(
      staff,
      'nexora_staff_refresh',
    );

    await request(server())
      .post('/api/auth/staff/logout')
      .set('Origin', STAFF_ORIGIN)
      .set('Cookie', `${guestCookie}; ${staffCookie}`)
      .expect(204);

    await request(server())
      .post('/api/auth/staff/refresh')
      .set('Origin', STAFF_ORIGIN)
      .set('Cookie', staffCookie)
      .expect(401);

    await request(server())
      .post('/api/auth/guest/refresh')
      .set('Origin', GUEST_ORIGIN)
      .set('Cookie', guestCookie)
      .expect(200);
  }, 30_000);

  it('rejects signing into the wrong application', async () => {
    for (const attempt of [
      {
        realm: 'guest',
        origin: GUEST_ORIGIN,
        email: STAFF_EMAIL,
      },
      {
        realm: 'staff',
        origin: STAFF_ORIGIN,
        email: GUEST_EMAIL,
      },
    ]) {
      const response = await request(server())
        .post(`/api/auth/${attempt.realm}/login`)
        .set('Origin', attempt.origin)
        .send({ email: attempt.email, password: PASSWORD })
        .expect(401);

      expect(response.headers['set-cookie']).toBeUndefined();
    }
  }, 30_000);

  it('rejects crossed refresh/logout tokens without revoking the owner session', async () => {
    for (const owner of ['guest', 'staff'] as const) {
      const other = owner === 'guest' ? 'staff' : 'guest';
      const origin =
        owner === 'guest' ? GUEST_ORIGIN : STAFF_ORIGIN;
      const otherOrigin =
        other === 'guest' ? GUEST_ORIGIN : STAFF_ORIGIN;

      const response = await login(owner);
      const cookie = responseCookie(
        response,
        `nexora_${owner}_refresh`,
      );
      const rawToken = cookie.slice(cookie.indexOf('=') + 1);
      const crossedCookie = `nexora_${other}_refresh=${rawToken}`;

      for (const action of ['refresh', 'logout']) {
        await request(server())
          .post(`/api/auth/${other}/${action}`)
          .set('Origin', otherOrigin)
          .set('Cookie', crossedCookie)
          .expect(401);
      }

      await request(server())
        .post(`/api/auth/${owner}/refresh`)
        .set('Origin', origin)
        .set('Cookie', cookie)
        .expect(200);
    }
  }, 30_000);

  it('rejects missing or crossed frontend origins', async () => {
    for (const realm of ['guest', 'staff']) {
      const wrongOrigin =
        realm === 'guest' ? STAFF_ORIGIN : GUEST_ORIGIN;

      for (const action of ['login', 'refresh', 'logout']) {
        await request(server())
          .post(`/api/auth/${realm}/${action}`)
          .set('Origin', wrongOrigin)
          .send({ email: GUEST_EMAIL, password: PASSWORD })
          .expect(403);

        await request(server())
          .post(`/api/auth/${realm}/${action}`)
          .send({ email: GUEST_EMAIL, password: PASSWORD })
          .expect(403);
      }
    }
  });

  it('does not restore the legacy shared cookie', async () => {
    for (const realm of ['guest', 'staff']) {
      await request(server())
        .post(`/api/auth/${realm}/refresh`)
        .set(
          'Origin',
          realm === 'guest' ? GUEST_ORIGIN : STAFF_ORIGIN,
        )
        .set('Cookie', `nexora_refresh=${'a'.repeat(64)}`)
        .expect(401);
    }
  });
});