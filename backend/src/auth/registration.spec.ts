
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
} from 'vitest';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import { PasswordService } from './password.service.js';
import { RegistrationService } from './registration.service.js';
import {
  hashVerificationToken,
} from './registration.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailService } from './email.service.js';

const TEST_DATABASE = resolve(
  process.cwd(),
  'step7.registration.test.db',
);

const DEVELOPMENT_DATABASE = resolve(
  process.cwd(),
  'dev.db',
);

const suffix = randomUUID();

const PASSWORD = 'Step7-Test-Password-2026!';

const messages: Array<{
  email: string;
  token: string;
}> = [];

let prisma: PrismaClient;
let registration: RegistrationService;
let verification: EmailVerificationService;
let passwordService: PasswordService;

function checkIsolation(): void {
  if (
    process.cwd().split(/[\\/]/).at(-1) !== 'backend'
  ) {
    throw new Error('Run tests from the backend directory.');
  }

  if (!existsSync(TEST_DATABASE)) {
    throw new Error('Step 7 test database does not exist.');
  }

  if (
    existsSync(DEVELOPMENT_DATABASE) &&
    realpathSync(TEST_DATABASE) === realpathSync(DEVELOPMENT_DATABASE)
  ) {
    throw new Error('Refusing to use the development database.');
  }
}

async function register(email: string) {
  return registration.register({
    firstName: 'Step',
    lastName: 'Seven',
    email,
    password: PASSWORD,
  });
}

function latestToken(email: string): string {
  const message = [...messages]
    .reverse()
    .find((entry) => entry.email === email);

  if (!message) {
    throw new Error('Verification message not generated.');
  }

  return message.token;
}

describe('Phase 3 Step 7 — Guest registration', () => {
  beforeAll(async () => {
    checkIsolation();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./step7.registration.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    passwordService = new PasswordService();

    const fakeEmailService = {
      sendVerificationEmail: async (
        email: string,
        token: string,
      ) => {
        messages.push({ email, token });
      },
    } as EmailService;

    registration = new RegistrationService(
      prisma as never,
      passwordService,
      fakeEmailService,
    );

    verification = new EmailVerificationService(
      prisma as never,
      fakeEmailService,
    );

    await prisma.role.upsert({
      where: { name: 'GUEST' },
      update: {},
      create: { name: 'GUEST' },
    });
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          email: {
            endsWith: `-${suffix}@example.invalid`,
          },
        },
        select: { id: true },
      });

      const userIds = users.map((user) => user.id);

      if (userIds.length > 0) {
        await prisma.emailVerificationToken.deleteMany({
          where: { userId: { in: userIds } },
        });

        await prisma.guest.deleteMany({
          where: { userId: { in: userIds } },
        });

        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it('creates a PENDING GUEST account and guest profile', async () => {
    const email = `pending-${suffix}@example.invalid`;

    const result = await register(email);

    expect(result.accountStatus).toBe('PENDING');

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        guest: true,
      },
    });

    expect(user?.status).toBe('PENDING');
    expect(user?.role.name).toBe('GUEST');
    expect(user?.guest?.firstName).toBe('Step');
    expect(user?.guest?.userId).toBe(user?.id);

    expect(user?.passwordHash).not.toBe(PASSWORD);

    expect(
      await passwordService.verifyPassword(
        user!.passwordHash,
        PASSWORD,
      ),
    ).toBe(true);
  });

  it('stores the verification token as a hash', async () => {
    const email = `hash-${suffix}@example.invalid`;

    await register(email);

    const token = latestToken(email);

    const stored = await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash: hashVerificationToken(token),
      },
    });

    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).not.toBe(token);
    expect(stored?.usedAt).toBeNull();
  });

  it('activates a PENDING account after verification', async () => {
    const email = `active-${suffix}@example.invalid`;

    await register(email);

    await verification.verifyEmail(latestToken(email));

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user?.status).toBe('ACTIVE');
  });

  it('rejects reuse of a verification token', async () => {
    const email = `reuse-${suffix}@example.invalid`;

    await register(email);

    const token = latestToken(email);

    await verification.verifyEmail(token);

    await expect(
      verification.verifyEmail(token),
    ).rejects.toThrow();
  });

  it('rejects an expired verification token', async () => {
    const email = `expired-${suffix}@example.invalid`;

    await register(email);

    const token = latestToken(email);

    await prisma.emailVerificationToken.update({
      where: {
        tokenHash: hashVerificationToken(token),
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(
      verification.verifyEmail(token),
    ).rejects.toThrow();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user?.status).toBe('PENDING');
  });

  it('does not create a duplicate account', async () => {
    const email = `duplicate-${suffix}@example.invalid`;

    const first = await register(email);
    const second = await register(email);

    expect(second).toEqual(first);

    const count = await prisma.user.count({
      where: { email },
    });

    expect(count).toBe(1);
  });

  it('resends verification and invalidates the old link', async () => {
    const email = `resend-${suffix}@example.invalid`;

    await register(email);

    const oldToken = latestToken(email);

    await verification.resendVerification(email);

    const newToken = latestToken(email);

    expect(newToken).not.toBe(oldToken);

    await expect(
      verification.verifyEmail(oldToken),
    ).rejects.toThrow();

    await verification.verifyEmail(newToken);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user?.status).toBe('ACTIVE');
  });

  it('does not reveal unknown accounts during resend', async () => {
    const email = `unknown-${suffix}@example.invalid`;

    const response = await verification.resendVerification(email);

    expect(response.message).toBe(
      'If the account is eligible, a verification email will be sent.',
    );
  });

  it('normalizes email addresses before registration', async () => {
    const normalized = `normalized-${suffix}@example.invalid`;

    await register(`  ${normalized.toUpperCase()}  `);

    const user = await prisma.user.findUnique({
      where: { email: normalized },
    });

    expect(user).not.toBeNull();
  });
});
