import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import {
  RESET_LOGIN_FAILURES,
  type LoginFailureState,
} from './login-lockout.policy.js';

let directory = '';
let prisma: PrismaClient | undefined;
let auth: AuthService;
let passwordHash: string;
const password = 'Synthetic-Lockout-Password-123!';

function db(): PrismaClient {
  if (!prisma) throw new Error('Isolated test database unavailable.');
  return prisma;
}

async function status(operation: Promise<unknown>): Promise<number> {
  try {
    await operation;
    return 200;
  } catch (error: unknown) {
    if (error instanceof HttpException) return error.getStatus();
    throw error;
  }
}

async function account(
  state: Partial<LoginFailureState> = {},
  mustChangePassword = false,
) {
  const role = await db().role.upsert({
    where: { name: mustChangePassword ? 'RECEPTIONIST' : 'GUEST' },
    update: {},
    create: { name: mustChangePassword ? 'RECEPTIONIST' : 'GUEST' },
  });
  return db().user.create({
    data: {
      name: 'Synthetic lockout account',
      email: randomUUID() + '@example.invalid',
      roleId: role.id,
      passwordHash,
      status: 'ACTIVE',
      mustChangePassword,
      ...RESET_LOGIN_FAILURES,
      ...state,
    },
  });
}

describe('persisted login lockout', () => {
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-lockout-'));
    const path = join(directory, 'login.test.db');
    const sqlite = new Database(path);
    try {
      const migrations = resolve(process.cwd(), 'prisma/migrations');
      for (const entry of readdirSync(migrations, { withFileTypes: true })
        .filter((item) => item.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        sqlite.exec(readFileSync(
          join(migrations, entry.name, 'migration.sql'), 'utf8',
        ));
      }
    } finally {
      sqlite.close();
    }

    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: 'file:' + path.replaceAll('\\', '/'),
      }),
    });
    await prisma.$connect();
    const passwords = new PasswordService();
    passwordHash = await passwords.hashPassword(password);
    auth = new AuthService(
      prisma as unknown as PrismaService,
      passwords,
      new JwtService({ secret: 'synthetic-lockout-test-secret-at-least-32-bytes' }),
    );
  }, 15_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    if (directory) {
      const target = resolve(directory);
      if (
        !target.startsWith(resolve(tmpdir()) + sep) ||
        !basename(target).startsWith('nexora-lockout-')
      ) {
        throw new Error('Refusing to remove an unexpected test directory.');
      }
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('commits the fifth failure before rejecting authentication', async () => {
    const user = await account({
      failedLoginCount: 4,
      lastFailedLoginAt: new Date(),
    });
    expect(await status(auth.login({
      email: user.email, password: 'wrong-password',
    }))).toBe(401);

    const saved = await db().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.failedLoginCount).toBe(5);
    expect(saved.lockoutLevel).toBe(1);
    expect(saved.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    expect(await status(auth.login({ email: user.email, password }))).toBe(429);
    expect(await db().refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('resets escalation on successful login after a lock expires', async () => {
    const user = await account({
      failedLoginCount: 8,
      lockoutLevel: 4,
      lockedUntil: new Date(Date.now() - 1000),
      lastFailedLoginAt: new Date(Date.now() - 30 * 60_000),
    });
    expect(await status(auth.login({ email: user.email, password }))).toBe(200);
    const saved = await db().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.failedLoginCount).toBe(0);
    expect(saved.lockoutLevel).toBe(0);
    expect(saved.lockedUntil).toBeNull();
    expect(saved.lastFailedLoginAt).toBeNull();
    expect(await db().refreshToken.count({ where: { userId: user.id } })).toBe(1);
  });

  it('starts from one failure after an hour without failures', async () => {
    const user = await account({
      failedLoginCount: 8,
      lockoutLevel: 4,
      lockedUntil: new Date(Date.now() - 31 * 60_000),
      lastFailedLoginAt: new Date(Date.now() - 61 * 60_000),
    });
    expect(await status(auth.login({
      email: user.email, password: 'wrong-password',
    }))).toBe(401);
    const saved = await db().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.failedLoginCount).toBe(1);
    expect(saved.lockoutLevel).toBe(0);
    expect(saved.lockedUntil).toBeNull();
  });

  it('does not lose accepted failures from concurrent requests', async () => {
    const user = await account({
      failedLoginCount: 3,
      lastFailedLoginAt: new Date(),
    });
    const results = await Promise.all([1, 2].map(() =>
      status(auth.login({ email: user.email, password: 'wrong-password' })),
    ));
    const acceptedFailures = results.filter((value) => value === 401).length;
    expect(acceptedFailures).toBeGreaterThan(0);
    expect(results.every((value) => value === 401 || value === 503)).toBe(true);
    const saved = await db().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.failedLoginCount).toBe(3 + acceptedFailures);
    expect(saved.lockoutLevel).toBe(saved.failedLoginCount === 5 ? 1 : 0);
  });

  it('preserves the required temporary-password change flow', async () => {
    const user = await account({}, true);
    expect(await status(auth.login({ email: user.email, password }))).toBe(403);
    expect(await db().refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });

  it('uses the same response for unknown and wrong-password accounts', async () => {
    const user = await account();
    async function rejection(email: string) {
      try {
        await auth.login({ email, password: 'wrong-password' });
        throw new Error('Authentication should have failed.');
      } catch (error: unknown) {
        if (error instanceof HttpException) return error.getResponse();
        throw error;
      }
    }
    expect(await rejection(user.email)).toEqual(
      await rejection(randomUUID() + '@example.invalid'),
    );
  });
});
