import { afterAll, beforeAll, expect, it } from 'vitest';
import { createIsolatedTestDatabase, type IsolatedTestDatabase } from '../../test/helpers/isolated-database.js';
import { PasswordService } from '../auth/password.service.js';
import { USER_ROLES } from '../common/decorators/roles.decorator.js';
import { initializeHostedDemo } from './initialize-hosted-demo.js';

const input = {
  email: '  Owner@Example.invalid  ',
  password: 'Synthetic-initial-password-123!',
  property: { name: 'Test Condotel', address: 'Sample address', city: 'Sample city', province: 'Sample province' },
};
let db: IsolatedTestDatabase;

beforeAll(async () => { db = await createIsolatedTestDatabase(); });
afterAll(async () => { await db?.dispose(); });

it('rejects invalid credentials before writing to a fresh database', async () => {
  await expect(initializeHostedDemo(db.prisma, { ...input, password: 'too-short' })).rejects.toThrow('12–128');
  expect(await db.prisma.role.count()).toBe(0);
  expect(await db.prisma.property.count()).toBe(0);
  expect(await db.prisma.user.count()).toBe(0);
});

it('creates one active owner, starts with all roles, and keeps the existing account on repeat runs', async () => {
  expect(await initializeHostedDemo(db.prisma, input)).toBe('created');
  const owner = await db.prisma.user.findUniqueOrThrow({
    where: { email: 'owner@example.invalid' }, include: { role: true },
  });
  expect(owner.role.name).toBe('SUPER_ADMIN');
  expect(owner.status).toBe('ACTIVE');
  expect(await new PasswordService().verifyPassword(owner.passwordHash, input.password)).toBe(true);
  expect((await db.prisma.role.findMany()).map((role) => role.name).sort()).toEqual(Object.values(USER_ROLES).sort());
  expect((await db.prisma.property.findFirstOrThrow()).name).toBe(input.property.name);

  expect(await initializeHostedDemo(db.prisma, {
    ...input, email: 'someone-else@example.invalid', password: 'Synthetic-other-password-123!',
    property: { ...input.property, name: 'Another property' },
  })).toBe('skipped');
  expect(await db.prisma.user.count()).toBe(1);
  expect(await db.prisma.property.count()).toBe(1);
  const unchanged = await db.prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
  expect(unchanged.passwordHash).toBe(owner.passwordHash);
});
