import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

afterEach(() => vi.unstubAllEnvs());
describe('Explicit isolated runtime database', () => {
  it('opens the absolute override instead of the default database', async () => {
    const root = process.cwd();
    const directory = mkdtempSync(resolve(root, '.phase7-runtime-'));
    const target = resolve(directory, 'runtime.test.db');
    vi.stubEnv('NEXORA_RUNTIME_DATABASE_URL', `file:${target.replaceAll('\\', '/')}`);
    const prisma = new PrismaService();
    try {
      await prisma.onModuleInit();
      const databases = await prisma.$queryRawUnsafe<{ file: string }[]>('PRAGMA database_list');
      expect(resolve(databases[0].file)).toBe(resolve(target));
      expect(existsSync(target)).toBe(true);
    } finally {
      await prisma.onModuleDestroy();
      if (resolve(directory, '..') === resolve(root) && directory.startsWith(resolve(root, '.phase7-runtime-'))) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });
  it('rejects an ambiguous relative override before opening a database', () => {
    vi.stubEnv('NEXORA_RUNTIME_DATABASE_URL', 'file:./ambiguous.test.db');
    expect(() => new PrismaService()).toThrow('absolute file: path');
  });
});
