
import { createHash, randomUUID } from 'node:crypto';
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

const TEST_DATABASE = resolve(
  process.cwd(),
  'step3.auth.test.db',
);

const DEVELOPMENT_DATABASE = resolve(
  process.cwd(),
  'dev.db',
);

const TEST_JWT_SECRET =
  'nexora-step4-test-secret-only-not-for-production';

const TEST_PASSWORD = 'Step4-Test-Password-2026!';

let prisma: PrismaClient;
let authService: AuthService;
let userId: string;
let userEmail: string;

function verifyDatabaseIsolation(): void {
  if (
    process.cwd().split(/[\\/]/).at(-1) !== 'backend'
  ) {
    throw new Error('Run tests from the backend directory.');
  }

  if (!existsSync(TEST_DATABASE)) {
    throw new Error(
      'Missing step3.auth.test.db. Do not use dev.db.',
    );
  }

  if (
    existsSync(DEVELOPMENT_DATABASE) &&
    realpathSync(TEST_DATABASE) ===
      realpathSync(DEVELOPMENT_DATABASE)
  ) {
    throw new Error(
      'Authentication test database points to dev.db.',
    );
  }
}

function hashRefreshToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

async function login() {
  return authService.login({
    email: userEmail,
    password: TEST_PASSWORD,
  });
}

describe('NEXORA Step 4 logout and revocation', () => {
  beforeAll(async () => {
    verifyDatabaseIsolation();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./step3.auth.test.db',
    });

    prisma = new PrismaClient({ adapter });

    await prisma.$connect();

    const passwordService = new PasswordService();

    const jwtService = new JwtService({
      secret: TEST_JWT_SECRET,
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

    const uniqueId = randomUUID();

    userEmail = `step4-${uniqueId}@example.invalid`;

    const role = await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Step 4 Test User',
        email: userEmail,
        passwordHash:
          await passwordService.hashPassword(TEST_PASSWORD),
        status: 'ACTIVE',
        roleId: role.id,
      },
    });

    userId = user.id;
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

    try {
      if (userId) {
        await prisma.refreshToken.deleteMany({
          where: { userId },
        });

        await prisma.user.delete({
          where: { id: userId },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('revokes the current refresh-token family', async () => {
    const session = await login();

    await authService.logout(session.refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: hashRefreshToken(
          session.refreshToken,
        ),
      },
    });

    expect(storedToken?.revokedAt).not.toBeNull();
    expect(storedToken?.familyId).toBeTruthy();
  });

  it('rejects refresh after logout', async () => {
    const session = await login();

    await authService.logout(session.refreshToken);

    await expect(
      authService.refresh(session.refreshToken),
    ).rejects.toThrow('Invalid refresh session.');
  });

  it('allows repeated logout', async () => {
    const session = await login();

    await expect(
      authService.logout(session.refreshToken),
    ).resolves.toBeUndefined();

    await expect(
      authService.logout(session.refreshToken),
    ).resolves.toBeUndefined();
  });

  it('handles a missing refresh credential', async () => {
    await expect(
      authService.logout(undefined),
    ).resolves.toBeUndefined();
  });

  it('handles malformed and unknown credentials', async () => {
    await expect(
      authService.logout('invalid'),
    ).resolves.toBeUndefined();

    await expect(
      authService.logout('f'.repeat(64)),
    ).resolves.toBeUndefined();
  });

  it('revokes a session after its token was rotated', async () => {
    const first = await login();

    const rotated = await authService.refresh(
      first.refreshToken,
    );

    await authService.logout(rotated.refreshToken);

    await expect(
      authService.refresh(rotated.refreshToken),
    ).rejects.toThrow('Invalid refresh session.');
  });

  it('does not log out another independent device', async () => {
    const deviceA = await login();
    const deviceB = await login();

    const tokenA = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: hashRefreshToken(
          deviceA.refreshToken,
        ),
      },
    });

    const tokenB = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: hashRefreshToken(
          deviceB.refreshToken,
        ),
      },
    });

    expect(tokenA?.familyId).toBeTruthy();
    expect(tokenB?.familyId).toBeTruthy();
    expect(tokenA?.familyId).not.toBe(tokenB?.familyId);

    await authService.logout(deviceA.refreshToken);

    await expect(
      authService.refresh(deviceA.refreshToken),
    ).rejects.toThrow('Invalid refresh session.');

    const deviceBRefresh = await authService.refresh(
      deviceB.refreshToken,
    );

    expect(deviceBRefresh.accessToken).toBeTruthy();
  });

  it('handles an expired refresh credential', async () => {
    const session = await login();

    await prisma.refreshToken.update({
      where: {
        tokenHash: hashRefreshToken(
          session.refreshToken,
        ),
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(
      authService.logout(session.refreshToken),
    ).resolves.toBeUndefined();

    await expect(
      authService.refresh(session.refreshToken),
    ).rejects.toThrow('Invalid refresh session.');
  });
});
