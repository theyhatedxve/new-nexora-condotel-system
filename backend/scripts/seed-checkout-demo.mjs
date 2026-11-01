import { basename, isAbsolute, resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../dist/generated/prisma/client.js';

// Explicitly isolated, synthetic data only. Never fall back to dev.db.
const url = process.env.NEXORA_RUNTIME_DATABASE_URL ?? '';
const target = url.startsWith('file:') ? url.slice(5) : '';
if (!isAbsolute(target) || basename(target) !== 'phase7.step2.manual.test.db') {
  throw new Error('Set the absolute NEXORA_RUNTIME_DATABASE_URL for phase7.step2.manual.test.db first.');
}
if (existsSync(target)) throw new Error('The isolated database already exists. Nothing was overwritten.');
// Test-only initializer. This applies SQL to a new empty SQLite file;
// it does not create Prisma migration-deployment history.
const database = new DatabaseSync(target);
try {
  const migrations = resolve('prisma/migrations');
  for (const folder of readdirSync(migrations, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    database.exec(readFileSync(resolve(migrations, folder.name, 'migration.sql'), 'utf8'));
  }
} finally { database.close(); }
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
try {
  if (await prisma.property.count() !== 0) throw new Error('Demo seed requires an empty isolated database. Existing data was not changed.');
  await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({ data: { name: 'NEXORA Test Property', address: 'Test address', city: 'Test city', province: 'Test province' } });
    const type = await tx.roomType.create({ data: { propertyId: property.id, name: 'Demo Deluxe', capacity: 2, baseRateCentavos: 250_000 } });
    await tx.room.create({ data: { roomTypeId: type.id, roomNumber: '101' } });
  });
  process.stdout.write('Synthetic property, room type and ready room created in the isolated database.\n');
} finally { await prisma.$disconnect(); }
