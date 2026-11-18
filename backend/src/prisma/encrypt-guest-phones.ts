import 'dotenv/config';
import { isAbsolute } from 'node:path';
import { PrismaService } from './prisma.service.js';
import { migrateGuestPhones } from './guest-phone-migration.js';

async function main(): Promise<void> {
  const mode = process.argv[2];
  const databaseUrl = process.env.NEXORA_RUNTIME_DATABASE_URL;

  if (
    process.env.NODE_ENV !== 'development' ||
    process.argv.length !== 3 ||
    !['--check', '--apply'].includes(mode ?? '') ||
    !databaseUrl?.startsWith('file:') ||
    !isAbsolute(databaseUrl.slice(5))
  ) {
    throw new Error(
      'Use development mode, an explicit absolute SQLite URL, and --check or --apply.',
    );
  }

  const prisma = new PrismaService();

  try {
    await prisma.$connect();
    const result = await migrateGuestPhones(prisma, mode === '--apply');
    console.log(JSON.stringify({ mode, ...result }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'Guest phone conversion failed. Check the mode, database configuration, encryption keys, and stored data.',
  );
  process.exitCode = 1;
});