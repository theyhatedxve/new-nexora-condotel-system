import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import {
  createIsolatedTestDatabase, type IsolatedTestDatabase,
} from '../../test/helpers/isolated-database.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { StaffProfileService } from './staff-profile.service.js';

let database: IsolatedTestDatabase;
let service: StaffProfileService;
let passwordHash: string;
const passwords = new PasswordService();
const password = 'Synthetic-Profile-Password-123!';

async function account(roleName = 'ADMIN') {
  const role = await database.prisma.role.upsert({
    where: { name: roleName }, update: {}, create: { name: roleName },
  });
  const user = await database.prisma.user.create({
    data: {
      name: 'Profile test', email: randomUUID() + '@example.invalid',
      roleId: role.id, passwordHash, status: 'ACTIVE',
    },
  });
  return { user, identity: { id: user.id, email: user.email, role: roleName } };
}

describe('staff self-profile', () => {
  beforeAll(async () => {
    database = await createIsolatedTestDatabase();
    passwordHash = await passwords.hashPassword(password);
    service = new StaffProfileService(
      database.prisma as unknown as PrismaService, passwords,
    );
  }, 20_000);

  afterAll(async () => { await database?.dispose(); });

  it.each(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'])(
    'allows %s to update its own details', async (role) => {
      const { user, identity } = await account(role);
      const result = await service.update({
        updatedAt: user.updatedAt.toISOString(), name: 'Updated name',
        phone: '+63 912 345 6789', address: 'Synthetic address',
      }, identity);
      expect(result.id).toBe(user.id);
      expect(result.name).toBe('Updated name');
      expect(result.phone).toBe('+63 912 345 6789');
      const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(saved.sessionVersion).toBe(user.sessionVersion);
      expect(saved.roleId).toBe(user.roleId);
    },
  );

  it('reads only the current account without exposing password or session data', async () => {
    const first = await account();
    await account();
    const profile = await service.read(first.identity);
    expect(profile.id).toBe(first.user.id);
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile).not.toHaveProperty('sessionVersion');
  });

  it('rejects Guest access', async () => {
    const { identity } = await account('GUEST');
    await expect(service.read(identity)).rejects.toThrow('Staff access is required.');
  });

  it('rejects a wrong current password without changing email', async () => {
    const { user, identity } = await account();
    await expect(service.changeEmail({
      updatedAt: user.updatedAt.toISOString(), email: randomUUID() + '@example.invalid',
      currentPassword: 'Incorrect-Password-123!',
    }, identity)).rejects.toThrow('current password is incorrect');
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.email).toBe(user.email);
    expect(saved.sessionVersion).toBe(user.sessionVersion);
  });

  it('rejects an email already used by another account', async () => {
    const first = await account();
    const second = await account();
    await expect(service.changeEmail({
      updatedAt: first.user.updatedAt.toISOString(), email: second.user.email,
      currentPassword: password,
    }, first.identity)).rejects.toThrow('already used');
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: first.user.id } });
    expect(saved.email).toBe(first.user.email);
    expect(saved.sessionVersion).toBe(first.user.sessionVersion);
  });

  it('changes email without changing the password and invalidates old identity', async () => {
    const { user, identity } = await account();
    const email = randomUUID() + '@example.invalid';
    await service.changeEmail({
      updatedAt: user.updatedAt.toISOString(), email, currentPassword: password,
    }, identity);
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.email).toBe(email);
    expect(saved.passwordHash).toBe(user.passwordHash);
    expect(saved.sessionVersion).toBe(user.sessionVersion + 1);
    await expect(service.read(identity)).rejects.toThrow('Sign in again');
    const audit = await database.prisma.auditLog.findFirstOrThrow({
      where: { entityId: user.id, action: 'STAFF_EMAIL_CHANGED' },
    });
    expect(audit.detailsJson).not.toContain(email);
    expect(audit.detailsJson).not.toContain(password);
  });

  it('changes password and revokes refresh sessions', async () => {
    const { user, identity } = await account();
    const token = await database.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) },
    });
    const nextPassword = 'Replacement-Profile-Password-123!';
    await service.changePassword({
      updatedAt: user.updatedAt.toISOString(), currentPassword: password,
      newPassword: nextPassword, confirmPassword: nextPassword,
    }, identity);
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.sessionVersion).toBe(user.sessionVersion + 1);
    expect(await passwords.verifyPassword(saved.passwordHash, nextPassword)).toBe(true);
    expect(await passwords.verifyPassword(saved.passwordHash, password)).toBe(false);
    const revoked = await database.prisma.refreshToken.findUniqueOrThrow({ where: { id: token.id } });
    expect(revoked.revokedAt).not.toBeNull();
  }, 15_000);

  it('rejects mismatching passwords without updating the account', async () => {
    const { user, identity } = await account();
    await expect(service.changePassword({
      updatedAt: user.updatedAt.toISOString(), currentPassword: password,
      newPassword: 'Replacement-Password-123!', confirmPassword: 'Different-Password-123!',
    }, identity)).rejects.toThrow('do not match');
    const saved = await database.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.passwordHash).toBe(user.passwordHash);
    expect(saved.sessionVersion).toBe(user.sessionVersion);
  });

  it('rejects stale profile updates', async () => {
    const { user, identity } = await account();
    const input = {
      updatedAt: user.updatedAt.toISOString(), name: 'First update', phone: '', address: '',
    };
    await service.update(input, identity);
    await expect(service.update({ ...input, name: 'Stale update' }, identity))
      .rejects.toThrow('profile changed');
  });
});
