
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

const TEST_DATABASE = resolve(process.cwd(), 'step3.auth.test.db');
const DEVELOPMENT_DATABASE = resolve(process.cwd(), 'dev.db');

const testSecret = 'step3-integration-only-strong-secret-not-production';

let prisma: PrismaClient;
let authService: AuthService;
let userId: string;
let userEmail: string;
let password: string;

function verifyDatabaseIsolation(): void {
  if (!existsSync(TEST_DATABASE)) {
    throw new Error('Missing step3.auth.test.db');
  }

  if (
    existsSync(DEVELOPMENT_DATABASE) &&
    realpathSync(TEST_DATABASE) === realpathSync(DEVELOPMENT_DATABASE)
  ) {
    throw new Error('Test database points to dev.db');
  }

  if (process.cwd().split(/[\\/]/).at(-1) !== 'backend') {
    throw new Error('Run tests from the backend directory.');
  }
}

describe('NEXORA Step 3 authentication', () => {
  beforeAll(async () => {
    verifyDatabaseIsolation();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./step3.auth.test.db',
    });

    prisma = new PrismaClient({ adapter });

    await prisma.$connect();

    const passwordService = new PasswordService();

    const jwtService = new JwtService({
      secret: testSecret,
      signOptions: {
        algorithm: 'HS256',
        issuer: 'nexora-api',
        audience: 'nexora-web',
        expiresIn: 900,
      },
    });

    authService = new AuthService(
      prisma as never,
      passwordService,
      jwtService,
    );

    const suffix = randomUUID();

    userEmail = `step3-${suffix}@example.invalid`;
    password = 'Step3-Integration-Test-Password!';

    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Step 3 Test User',
        email: userEmail,
        passwordHash: await passwordService.hashPassword(password),
        status: 'ACTIVE',
        roleId: role.id,
      },
    });

    userId = user.id;
  });

  afterAll(async () => {
    if (prisma) {
      if (userId) {
        await prisma.refreshToken.deleteMany({
          where: { userId },
        });

        await prisma.user.delete({
          where: { id: userId },
        });
      }

      await prisma.$disconnect();
    }
  });

  it('logs in with valid credentials', async () => {
    const result = await authService.login({
      email: userEmail,
      password,
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.user?.role).toBe('GUEST');
    expect(result.expiresIn).toBe(900);
  });

  it('rejects an incorrect password', async () => {
    await expect(
      authService.login({
        email: userEmail,
        password: 'Incorrect-Password!',
      }),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('rejects a disabled account', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'DISABLED' },
    });

    try {
      await expect(
        authService.login({
          email: userEmail,
          password,
        }),
      ).rejects.toThrow('Invalid email or password.');
    } finally {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }
  });

  it('rotates a valid refresh credential', async () => {
    const login = await authService.login({
      email: userEmail,
      password,
    });

    const refreshed = await authService.refresh(
      login.refreshToken,
    );

    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(
      login.refreshToken,
    );
  });

  it('revokes a family when an old token is reused', async () => {
    const login = await authService.login({
      email: userEmail,
      password,
    });

    const refreshed = await authService.refresh(
      login.refreshToken,
    );

    await expect(
      authService.refresh(login.refreshToken),
    ).rejects.toThrow('Invalid refresh session.');

    await expect(
      authService.refresh(refreshed.refreshToken),
    ).rejects.toThrow('Invalid refresh session.');
  });

  it('rejects a malformed refresh credential', async () => {
    await expect(
      authService.refresh('invalid'),
    ).rejects.toThrow('Invalid refresh session.');
  });

  it('rejects a refresh credential for a disabled account', async () => {
    const login = await authService.login({
      email: userEmail,
      password,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'DISABLED' },
    });

    try {
      await expect(
        authService.refresh(login.refreshToken),
      ).rejects.toThrow('Invalid refresh session.');
    } finally {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }
  });

    it('does not allow two successful rotations of the same token', async () => {
    const login = await authService.login({
        email: userEmail,
        password,
    });

    const results = await Promise.allSettled([
        authService.refresh(login.refreshToken),
        authService.refresh(login.refreshToken),
    ]);

    const successes = results.filter(
        (result) => result.status === 'fulfilled',
    );

    expect(successes).toHaveLength(1);
    });


});
