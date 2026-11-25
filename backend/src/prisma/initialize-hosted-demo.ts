import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isEmail } from 'class-validator';
import { PasswordService } from '../auth/password.service.js';
import { USER_ROLES } from '../common/decorators/roles.decorator.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

type InitialSetup = {
  email: string;
  password: string;
  property: { name: string; address: string; city: string; province: string };
};

class SetupError extends Error {}

export async function initializeHostedDemo(
  prisma: PrismaClient,
  input: InitialSetup,
): Promise<'created' | 'skipped'> {
  return prisma.$transaction(async (tx) => {
    // Acquire the SQLite write lock before checking whether another initializer ran.
    await tx.$executeRaw`UPDATE "Role" SET "name" = "name" WHERE 1 = 0`;
    if (await tx.user.findFirst({ select: { id: true } })) return 'skipped';

    const email = input.email.trim().toLowerCase();
    if (email.length > 254 || !isEmail(email)) {
      throw new SetupError('Set NEXORA_INITIAL_ADMIN_EMAIL to a valid email address.');
    }
    if (input.password.trim().length < 12 || input.password.length > 128) {
      throw new SetupError('Set NEXORA_INITIAL_ADMIN_PASSWORD to a private password of 12–128 characters.');
    }

    const passwordHash = await new PasswordService().hashPassword(input.password);
    const roles = Object.values(USER_ROLES);
    for (const name of roles) {
      await tx.role.upsert({ where: { name }, create: { name }, update: {} });
    }

    if (!(await tx.property.findFirst({ select: { id: true } }))) {
      await tx.property.create({ data: input.property });
    }

    await tx.user.create({
      data: {
        name: 'NEXORA Owner',
        email,
        passwordHash,
        status: 'ACTIVE',
        role: { connect: { name: USER_ROLES.SUPER_ADMIN } },
      },
    });
    return 'created';
  });
}

async function main(): Promise<void> {
  const database = process.env.NEXORA_RUNTIME_DATABASE_URL;
  if (!database?.startsWith('file:') || !isAbsolute(database.slice(5)) ||
      database !== process.env.DATABASE_URL) {
    throw new SetupError('Set DATABASE_URL and NEXORA_RUNTIME_DATABASE_URL to the same absolute SQLite file URL.');
  }

  const prisma = new PrismaService();
  try {
    const result = await initializeHostedDemo(prisma, {
      email: process.env.NEXORA_INITIAL_ADMIN_EMAIL ?? '',
      password: process.env.NEXORA_INITIAL_ADMIN_PASSWORD ?? '',
      property: {
        name: 'NEXORA Demo Condotel',
        address: 'Demo address',
        city: 'Demo city',
        province: 'Demo province',
      },
    });
    console.log(result === 'created'
      ? 'NEXORA initial Super Admin created.'
      : 'NEXORA account initialization skipped because the database already contains users.');
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof SetupError
      ? error.message
      : 'NEXORA account initialization failed. Check that migrations ran against the configured SQLite database.');
    process.exitCode = 1;
  });
}
