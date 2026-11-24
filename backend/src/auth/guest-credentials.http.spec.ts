import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestDatabase, type IsolatedTestDatabase } from '../../test/helpers/isolated-database.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { AuthRealmController } from './auth-realm.controller.js';
import { PasswordService } from './password.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import type { EmailService } from './email.service.js';
import { GuestCredentialsController } from './guest-credentials.controller.js';
import { GuestCredentialsService } from './guest-credentials.service.js';

const origin = 'http://localhost:5175';
const staffOrigin = 'http://localhost:5176';
const password = 'Synthetic-Guest-Http-Password-123!';
const nextPassword = 'Synthetic-Guest-Http-Replacement-123!';
const secret = 'synthetic-guest-credential-http-secret-long-enough';
const send = vi.fn(async (_email: string, _token: string, _purpose: string) => {});
let app: INestApplication;
let db: IsolatedTestDatabase;
let credentials: GuestCredentialsService;
let auth: AuthService;
let jwt: JwtService;
let passwordHash: string;

async function account(roleName = 'GUEST') {
  const role = await db.prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
  const user = await db.prisma.user.create({ data: {
    name: 'HTTP fixture', email: randomUUID() + '@example.invalid', passwordHash, status: 'ACTIVE', roleId: role.id,
  } });
  return { user, token: await jwt.signAsync({ sub: user.id, jti: randomUUID(), sv: user.sessionVersion }) };
}

describe('guest credential HTTP boundary', () => {
  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_ACCESS_SECRET', secret);
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', `${origin},${staffOrigin}`);
    vi.stubEnv('AUTH_GUEST_ALLOWED_ORIGINS', origin);
    vi.stubEnv('AUTH_STAFF_ALLOWED_ORIGINS', staffOrigin);
    db = await createIsolatedTestDatabase();
    const passwords = new PasswordService();
    passwordHash = await passwords.hashPassword(password);
    jwt = new JwtService({ secret, signOptions: {
      algorithm: 'HS256', expiresIn: 900, issuer: 'nexora-api', audience: 'nexora-web',
    } });
    auth = new AuthService(db.prisma as unknown as PrismaService, passwords, jwt);
    credentials = new GuestCredentialsService(db.prisma as unknown as PrismaService, passwords, {
      sendGuestCredentialEmail: send,
    } as unknown as EmailService);
    const module = await Test.createTestingModule({
      imports: [PassportModule, ThrottlerModule.forRoot([{ limit: 60, ttl: 60_000 }])],
      controllers: [GuestCredentialsController, AuthRealmController],
      providers: [
        { provide: PrismaService, useValue: db.prisma },
        { provide: AuthService, useValue: auth },
        { provide: GuestCredentialsService, useValue: credentials },
        JwtStrategy,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.dispose(); vi.unstubAllEnvs(); });

  it('requires authenticated guest access and rejects staff tokens', async () => {
    await request(app.getHttpServer()).post('/api/auth/guest/email').set('Origin', origin)
      .send({ email: 'new@example.invalid', currentPassword: password }).expect(401);
    const staff = await account('ADMIN');
    await request(app.getHttpServer()).post('/api/auth/guest/email').set('Origin', origin)
      .auth(staff.token, { type: 'bearer' }).send({ email: 'new@example.invalid', currentPassword: password }).expect(403);
  });

  it('rejects untrusted origins before a credential change', async () => {
    const guest = await account();
    await request(app.getHttpServer()).post('/api/auth/guest/email').set('Origin', staffOrigin)
      .auth(guest.token, { type: 'bearer' }).send({ email: 'new@example.invalid', currentPassword: password }).expect(403);
  });

  it('rejects unknown fields and password bounds without touching the account', async () => {
    const guest = await account();
    for (const body of [
      { currentPassword: password, newPassword: 'short', confirmPassword: 'short' },
      { currentPassword: password, newPassword: nextPassword, confirmPassword: nextPassword, userId: guest.user.id },
    ]) {
      await request(app.getHttpServer()).post('/api/auth/guest/password').set('Origin', origin)
        .auth(guest.token, { type: 'bearer' }).send(body).expect(400);
    }
    expect((await db.prisma.user.findUniqueOrThrow({ where: { id: guest.user.id } })).sessionVersion).toBe(0);
  });

  it('changes a password, clears only the guest cookie, and rejects old access and refresh credentials', async () => {
    const guest = await account();
    const session = await auth.login({ email: guest.user.email, password }, 'guest');
    const result = await request(app.getHttpServer()).post('/api/auth/guest/password').set('Origin', origin)
      .auth(guest.token, { type: 'bearer' })
      .send({ currentPassword: password, newPassword: nextPassword, confirmPassword: nextPassword }).expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['set-cookie'].join(';')).toContain('nexora_guest_refresh=;');
    expect(result.headers['set-cookie'].join(';')).toContain('Path=/api/auth/guest');
    expect(result.headers['set-cookie'].join(';')).not.toContain('nexora_staff_refresh');
    await request(app.getHttpServer()).post('/api/auth/guest/email').set('Origin', origin)
      .auth(guest.token, { type: 'bearer' }).send({ email: 'new@example.invalid', currentPassword: nextPassword }).expect(401);
    await expect(auth.refresh(session.refreshToken, 'guest')).rejects.toThrow();
    await expect(auth.login({ email: guest.user.email, password: nextPassword }, 'guest')).resolves.toHaveProperty('accessToken');
  });

  it('confirms a pending email by POST only and supports sign-in using the new email', async () => {
    const guest = await account();
    const email = randomUUID() + '@example.invalid';
    await credentials.requestEmailChange({ email, currentPassword: password }, { id: guest.user.id, email: guest.user.email, role: 'GUEST' });
    const token = send.mock.calls.at(-1)![1];
    await request(app.getHttpServer()).get('/api/auth/guest/confirm-email').query({ token }).expect(404);
    expect((await db.prisma.user.findUniqueOrThrow({ where: { id: guest.user.id } })).email).toBe(guest.user.email);
    await request(app.getHttpServer()).post('/api/auth/guest/confirm-email').set('Origin', origin).send({ token }).expect(200);
    await expect(auth.login({ email, password }, 'guest')).resolves.toHaveProperty('accessToken');
    await expect(auth.login({ email: guest.user.email, password }, 'guest')).rejects.toThrow();
  });

  it('recovers a forgotten password without a session and supports sign-in with the replacement', async () => {
    const guest = await account();
    const issued = await request(app.getHttpServer()).post('/api/auth/guest/forgot-password').set('Origin', origin).send({ email: guest.user.email }).expect(202);
    await vi.waitFor(() => expect(send.mock.calls.some((call) => call[0] === guest.user.email)).toBe(true));
    const token = send.mock.calls.find((call) => call[0] === guest.user.email)![1];
    expect(JSON.stringify(issued.body)).not.toContain(token);
    await request(app.getHttpServer()).post('/api/auth/guest/reset-password').set('Origin', origin)
      .send({ token, newPassword: nextPassword, confirmPassword: nextPassword }).expect(200);
    await expect(auth.login({ email: guest.user.email, password: nextPassword }, 'guest')).resolves.toHaveProperty('accessToken');
  });

  it('acknowledges recovery without waiting for account processing or email delivery', async () => {
    let release!: () => void;
    const delivery = new Promise<void>((resolve) => { release = resolve; });
    const spy = vi.spyOn(credentials, 'forgotPassword').mockImplementationOnce(async () => {
      await delivery;
      return { message: 'Generic acknowledgment' };
    });
    try {
      const pending = request(app.getHttpServer()).post('/api/auth/guest/forgot-password').set('Origin', origin)
        .send({ email: 'timing@example.invalid' }).expect(202);
      const result = await Promise.race([
        pending.then(() => 'acknowledged'),
        new Promise<string>((resolve) => setTimeout(() => resolve('waiting-for-delivery'), 300)),
      ]);
      expect(result).toBe('acknowledged');
    } finally { release(); spy.mockRestore(); }
  });

  it('uses a generic recovery acknowledgment and enforces the public request throttle', async () => {
    const first = await request(app.getHttpServer()).post('/api/auth/guest/forgot-password').set('Origin', origin)
      .send({ email: 'unknown-one@example.invalid' }).expect(202);
    expect(first.body.message).toContain('If this email belongs to an eligible guest account');
    await request(app.getHttpServer()).post('/api/auth/guest/forgot-password').set('Origin', origin)
      .send({ email: 'unknown-three@example.invalid' }).expect(429);
  });
});
