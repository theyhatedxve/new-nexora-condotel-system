import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../src/generated/prisma/client.js';

export interface IsolatedTestDatabase {
  prisma: PrismaClient;
  dispose(): Promise<void>;
}

export async function createIsolatedTestDatabase(): Promise<IsolatedTestDatabase> {
  const directory = mkdtempSync(join(tmpdir(), 'nexora-access-'));
  const databasePath = join(directory, 'access.test.db');
  const migrationDirectory = fileURLToPath(
    new URL('../../prisma/migrations/', import.meta.url),
  );
  let prisma: PrismaClient | undefined;
  let disposed = false;

  async function dispose(): Promise<void> {
    if (disposed) return;
    await prisma?.$disconnect();

    const target = resolve(directory);
    const relativeTarget = relative(resolve(tmpdir()), target);
    if (
      !relativeTarget || relativeTarget.startsWith('..') ||
      isAbsolute(relativeTarget) || !basename(target).startsWith('nexora-access-')
    ) {
      throw new Error('Unexpected temporary database directory.');
    }
    rmSync(target, { recursive: true, force: true });
    disposed = true;
  }

  try {
    const sqlite = new Database(databasePath);
    try {
      const migrations = readdirSync(migrationDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const migration of migrations) {
        const sql = readFileSync(
          join(migrationDirectory, migration.name, 'migration.sql'), 'utf8',
        );
        sqlite.exec(sql);
      }
    } finally {
      sqlite.close();
    }
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: 'file:' + databasePath.replaceAll('\\', '/'),
      }),
    });
    await prisma.$connect();
    return { prisma, dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}
