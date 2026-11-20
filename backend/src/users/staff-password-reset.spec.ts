import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createIsolatedTestDatabase, type IsolatedTestDatabase,
} from '../../test/helpers/isolated-database.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { StaffPasswordService } from '../auth/staff-password.service.js';
import { StaffInvitationService } from './staff-invitation.service.js';
import { UsersService } from './users.service.js';

let database: IsolatedTestDatabase;
let users: UsersService;
let originalHash: string;
const passwords = new PasswordService();
const originalPassword = 'Synthetic-Original-Password-123!';
const defaultPassword = 'Synthetic-Default-Password-123!';
const previousDefault = process.env.NEXORA_STAFF_DEFAULT_PASSWORD;

async function account(roleName: string) {
  const role = await database.prisma.role.upsert({
    where: { name: roleName }, update: {}, create: { name: roleName },
  });
  const user = await database.prisma.user.create({
    data: {
      name: 'Synthetic staff account', email: randomUUID() + '@example.invalid',
      roleId: role.id, passwordHash: originalHash, status: 'ACTIVE',
    },
  });
  return { user, identity: { id: user.id, email: user.email, role: roleName } };
}

describe('reset staff password to configured default', () => {
  beforeAll(async () => {
    process.env.NEXORA_STAFF_DEFAULT_PASSWORD = defaultPassword;
    database = await createIsolatedTestDatabase();
    originalHash = await passwords.hashPassword(originalPassword);
    users = new UsersService(
      database.prisma as unknown as PrismaService,
      passwords,
      new StaffInvitationService(),
    );
  }, 20_000);

  afterAll(async () => {
    if (previousDefault === undefined) {
      delete process.env.NEXORA_STAFF_DEFAULT_PASSWORD;
    } else {
      process.env.NEXORA_STAFF_DEFAULT_PASSWORD = previousDefault;
    }
    await database?.dispose();
  });

  it.each([
    ['SUPER_ADMIN', 'ADMIN'], ['SUPER_ADMIN', 'MANAGER'],
    ['SUPER_ADMIN', 'RECEPTIONIST'], ['ADMIN', 'MANAGER'], ['ADMIN', 'RECEPTIONIST'],
  ])('%s can reset %s', async (actorRole, targetRole) => {
    const actor = await account(actorRole);
    const target = await account(targetRole);
    const token = await database.prisma.refreshToken.create({
      data: {
        userId: target.user.id, tokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const result = await users.resetDefaultPassword(target.user.id, {
      updatedAt: target.user.updatedAt.toISOString(),
    }, actor.identity);
    expect(result.passwordReset).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.user.role).toBe(targetRole);
    expect(result.user.status).toBe('ACTIVE');
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: target.user.id } });
    expect(saved.sessionVersion).toBe(target.user.sessionVersion + 1);
    expect(await passwords.verifyPassword(saved.passwordHash, defaultPassword)).toBe(true);
    expect(await passwords.verifyPassword(saved.passwordHash, originalPassword)).toBe(false);
    const revoked = await database.prisma.refreshToken.findUniqueOrThrow({ where: { id: token.id } });
    expect(revoked.revokedAt).not.toBeNull();
    const audit = await database.prisma.auditLog.findFirstOrThrow({
      where: { entityId: target.user.id, action: 'staff.password.reset_to_default' },
    });
    expect(audit.detailsJson).not.toContain(defaultPassword);
  }, 15_000);

  it('does not allow an Admin to reset another Admin', async () => {
    const actor = await account('ADMIN');
    const target = await account('ADMIN');
    await expect(users.resetDefaultPassword(target.user.id, {
      updatedAt: target.user.updatedAt.toISOString(),
    }, actor.identity)).rejects.toThrow('cannot manage');
  });

  it.each(['MANAGER', 'RECEPTIONIST'])(
    'does not allow %s to reset another account', async (role) => {
      const actor = await account(role);
      const target = await account('RECEPTIONIST');
      await expect(users.resetDefaultPassword(target.user.id, {
        updatedAt: target.user.updatedAt.toISOString(),
      }, actor.identity)).rejects.toThrow('Administrator permission');
    },
  );

  it('does not reset Super Admin or the signed-in account', async () => {
    const actor = await account('SUPER_ADMIN');
    await expect(users.resetDefaultPassword(actor.user.id, {
      updatedAt: actor.user.updatedAt.toISOString(),
    }, actor.identity)).rejects.toThrow('Use My Profile');
    const target = await account('SUPER_ADMIN');
    await expect(users.resetDefaultPassword(target.user.id, {
      updatedAt: target.user.updatedAt.toISOString(),
    }, actor.identity)).rejects.toThrow('Use My Profile');
  });

  it.each(['PENDING', 'DISABLED'] as const)(
    'does not enable a %s account', async (status) => {
      const actor = await account('SUPER_ADMIN');
      const target = await account('RECEPTIONIST');
      const inactive = await database.prisma.user.update({
        where: { id: target.user.id }, data: { status },
      });
      await expect(users.resetDefaultPassword(inactive.id, {
        updatedAt: inactive.updatedAt.toISOString(),
      }, actor.identity)).rejects.toThrow('requires an active account');
      const unchanged = await database.prisma.user.findUniqueOrThrow({ where: { id: inactive.id } });
      expect(unchanged.status).toBe(status);
      expect(unchanged.passwordHash).toBe(originalHash);
    },
  );

  it('rejects replay using the previous account version', async () => {
    const actor = await account('SUPER_ADMIN');
    const target = await account('MANAGER');
    const input = { updatedAt: target.user.updatedAt.toISOString() };
    await users.resetDefaultPassword(target.user.id, input, actor.identity);
    await expect(users.resetDefaultPassword(target.user.id, input, actor.identity))
      .rejects.toThrow('account changed');
  });

  it('requires replacing the default through the existing temporary-password flow', async () => {
    const actor = await account('SUPER_ADMIN');
    const target = await account('RECEPTIONIST');
    await users.resetDefaultPassword(target.user.id, {
      updatedAt: target.user.updatedAt.toISOString(),
    }, actor.identity);
    const setup = new StaffPasswordService(database.prisma as unknown as PrismaService, passwords);
    const replacement = 'Synthetic-Replacement-Password-123!';
    await setup.changeTemporaryPassword({
      email: target.user.email, temporaryPassword: defaultPassword, newPassword: replacement,
    });
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: target.user.id } });
    expect(saved.mustChangePassword).toBe(false);
    expect(await passwords.verifyPassword(saved.passwordHash, replacement)).toBe(true);
    expect(await passwords.verifyPassword(saved.passwordHash, defaultPassword)).toBe(false);
  }, 15_000);
});
