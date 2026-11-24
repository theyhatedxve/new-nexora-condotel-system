import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createIsolatedTestDatabase, type IsolatedTestDatabase } from '../../test/helpers/isolated-database.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { EmailService } from './email.service.js';
import { PasswordService } from './password.service.js';
import { GuestCredentialsService } from './guest-credentials.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const password = 'Guest-Current-Password-123!';
const replacement = 'Guest-Replacement-Password-123!';
const passwords = new PasswordService();
let db: IsolatedTestDatabase;
let service: GuestCredentialsService;
let passwordHash: string;
const send = vi.fn(async (_email: string, _token: string, _purpose: string) => {});

async function account(roleName = 'GUEST', status: 'ACTIVE' | 'PENDING' | 'DISABLED' = 'ACTIVE') {
  const role = await db.prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
  const user = await db.prisma.user.create({ data: {
    name: 'Synthetic guest', email: randomUUID() + '@example.invalid', passwordHash, roleId: role.id, status,
    ...(roleName === 'GUEST' ? { guest: { create: { firstName: 'Synthetic', lastName: 'Guest', email: 'contact@example.invalid' } } } : {}),
  } });
  return { user, identity: { id: user.id, email: user.email, role: roleName } };
}
async function tokenFor(email: string) {
  await service.forgotPassword({ email });
  const message = send.mock.calls.findLast((call) => call[0] === email);
  if (!message) throw new Error('Expected a synthetic recovery email');
  return message[1];
}
async function saved(id: string) { return db.prisma.user.findUniqueOrThrow({ where: { id } }); }

describe('guest credential security', () => {
  beforeAll(async () => {
    vi.stubEnv('JWT_ACCESS_SECRET', 'synthetic-guest-credentials-test-secret-long-enough');
    db = await createIsolatedTestDatabase();
    passwordHash = await passwords.hashPassword(password);
    service = new GuestCredentialsService(db.prisma as unknown as PrismaService, passwords, {
      sendGuestCredentialEmail: send,
    } as unknown as EmailService);
  }, 30_000);
  afterAll(async () => { await db?.dispose(); vi.unstubAllEnvs(); });

  it('changes only its own password and revokes refresh and access sessions', async () => {
    const { user, identity } = await account();
    const other = await account();
    await db.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
    await service.changePassword({ currentPassword: password, newPassword: replacement, confirmPassword: replacement }, identity);
    const result = await saved(user.id);
    expect(await passwords.verifyPassword(result.passwordHash, replacement)).toBe(true);
    expect(result.sessionVersion).toBe(user.sessionVersion + 1);
    expect((await saved(other.user.id)).passwordHash).toBe(passwordHash);
    expect(await db.prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    const jwt = new JwtStrategy(db.prisma as unknown as PrismaService);
    await expect(jwt.validate({ sub: user.id, jti: randomUUID(), sv: user.sessionVersion })).rejects.toThrow();
  });

  it('rejects a wrong current password and mismatching or unchanged replacements', async () => {
    const { user, identity } = await account();
    await expect(service.changePassword({ currentPassword: 'wrong', newPassword: replacement, confirmPassword: replacement }, identity)).rejects.toThrow('current password');
    await expect(service.changePassword({ currentPassword: password, newPassword: replacement, confirmPassword: password }, identity)).rejects.toThrow('match');
    await expect(service.changePassword({ currentPassword: password, newPassword: password, confirmPassword: password }, identity)).rejects.toThrow('different');
    expect((await saved(user.id)).sessionVersion).toBe(0);
  });

  it('sends a hashed recovery token with a generic response and one-minute resend spacing', async () => {
    const { user } = await account();
    const unknown = await service.forgotPassword({ email: randomUUID() + '@example.invalid' });
    expect(await service.forgotPassword({ email: user.email.toUpperCase() })).toEqual(unknown);
    const count = send.mock.calls.length;
    expect(await service.forgotPassword({ email: user.email })).toEqual(unknown);
    expect(send.mock.calls.length).toBe(count);
    const token = send.mock.calls.at(-1)![1];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const stored = await db.prisma.guestCredentialToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBeLessThanOrEqual(30 * 60_000);
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('resets once, clears lockouts and invalidates all other credential links', async () => {
    const { user, identity } = await account();
    await service.requestEmailChange({ email: randomUUID() + '@example.invalid', currentPassword: password }, identity);
    const emailToken = send.mock.calls.at(-1)![1];
    const token = await tokenFor(user.email);
    await db.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 6, lockedUntil: new Date(Date.now() + 60_000) } });
    await service.resetPassword({ token, newPassword: replacement, confirmPassword: replacement });
    const result = await saved(user.id);
    expect(await passwords.verifyPassword(result.passwordHash, replacement)).toBe(true);
    expect(result.lockedUntil).toBeNull();
    expect(result.failedLoginCount).toBe(0);
    expect(result.sessionVersion).toBe(1);
    await expect(service.resetPassword({ token, newPassword: password, confirmPassword: password })).rejects.toThrow('link');
    await expect(service.confirmEmailChange({ token: emailToken })).rejects.toThrow('link');
  });

  it('does not consume a reset link when new passwords mismatch', async () => {
    const { user } = await account();
    const token = await tokenFor(user.email);
    await expect(service.resetPassword({ token, newPassword: replacement, confirmPassword: password })).rejects.toThrow('match');
    await service.resetPassword({ token, newPassword: replacement, confirmPassword: replacement });
  });

  it('keeps the old email active until explicit confirmation without changing Guest contact/history', async () => {
    const { user, identity } = await account();
    const email = randomUUID() + '@example.invalid';
    await service.requestEmailChange({ email: email.toUpperCase(), currentPassword: password }, identity);
    expect((await saved(user.id)).email).toBe(user.email);
    expect(send.mock.calls.at(-1)![0]).toBe(email);
    const token = send.mock.calls.at(-1)![1];
    await service.confirmEmailChange({ token });
    const result = await saved(user.id);
    expect(result.email).toBe(email);
    expect(result.status).toBe('ACTIVE');
    expect(result.sessionVersion).toBe(1);
    expect(result.passwordHash).toBe(passwordHash);
    expect((await db.prisma.guest.findUniqueOrThrow({ where: { userId: user.id } })).email).toBe('contact@example.invalid');
    await expect(service.confirmEmailChange({ token })).rejects.toThrow('link');
    const audit = await db.prisma.auditLog.findFirstOrThrow({ where: { entityId: user.id, action: 'GUEST_EMAIL_CHANGED' } });
    expect(audit.detailsJson).not.toContain(email);
    expect(audit.detailsJson).not.toContain(token);
  });

  it('rejects email conflicts both on request and at confirmation and rolls back the claim', async () => {
    const { user, identity } = await account();
    const other = await account();
    await expect(service.requestEmailChange({ email: other.user.email, currentPassword: password }, identity)).rejects.toThrow('available');
    const email = randomUUID() + '@example.invalid';
    await service.requestEmailChange({ email, currentPassword: password }, identity);
    const token = send.mock.calls.at(-1)![1];
    await db.prisma.user.update({ where: { id: other.user.id }, data: { email } });
    await expect(service.confirmEmailChange({ token })).rejects.toThrow('available');
    expect((await saved(user.id)).email).toBe(user.email);
    expect((await saved(user.id)).sessionVersion).toBe(0);
    expect(await db.prisma.guestCredentialToken.count({ where: { userId: user.id, usedAt: null } })).toBe(1);
  });

  it('rejects invalid, expired and wrong-purpose links without changing credentials', async () => {
    const { user, identity } = await account();
    const token = await tokenFor(user.email);
    await expect(service.confirmEmailChange({ token })).rejects.toThrow('link');
    await expect(service.resetPassword({ token: 'bad', newPassword: replacement, confirmPassword: replacement })).rejects.toThrow('link');
    await db.prisma.guestCredentialToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
    await expect(service.resetPassword({ token, newPassword: replacement, confirmPassword: replacement })).rejects.toThrow('link');
    await service.requestEmailChange({ email: randomUUID() + '@example.invalid', currentPassword: password }, identity);
    await expect(service.resetPassword({ token: send.mock.calls.at(-1)![1], newPassword: replacement, confirmPassword: replacement })).rejects.toThrow('link');
    expect((await saved(user.id)).passwordHash).toBe(passwordHash);
  });

  it.each(['ADMIN', 'GUEST_PENDING', 'GUEST_DISABLED'])('does not issue recovery for %s', async (kind) => {
    const { user, identity } = await account(kind === 'ADMIN' ? 'ADMIN' : 'GUEST', kind === 'GUEST_PENDING' ? 'PENDING' : kind === 'GUEST_DISABLED' ? 'DISABLED' : 'ACTIVE');
    const before = send.mock.calls.length;
    await service.forgotPassword({ email: user.email });
    expect(send.mock.calls.length).toBe(before);
    await expect(service.changePassword({ currentPassword: password, newPassword: replacement, confirmPassword: replacement }, identity)).rejects.toThrow();
  });

  it('rejects a token after the user is disabled or its credential version changes', async () => {
    for (const data of [{ status: 'DISABLED' as const }, { sessionVersion: { increment: 1 } }]) {
      const { user } = await account();
      const token = await tokenFor(user.email);
      await db.prisma.user.update({ where: { id: user.id }, data });
      await expect(service.resetPassword({ token, newPassword: replacement, confirmPassword: replacement })).rejects.toThrow('link');
    }
  });

  it('supersedes an old reset link after the resend interval', async () => {
    const { user } = await account();
    const old = await tokenFor(user.email);
    await db.prisma.guestCredentialToken.updateMany({ where: { userId: user.id }, data: { createdAt: new Date(Date.now() - 61_000) } });
    const next = await tokenFor(user.email);
    expect(next).not.toBe(old);
    await expect(service.resetPassword({ token: old, newPassword: replacement, confirmPassword: replacement })).rejects.toThrow('link');
    await service.resetPassword({ token: next, newPassword: replacement, confirmPassword: replacement });
  });

  it('allows only one simultaneous claim of a reset token', async () => {
    const { user } = await account();
    const token = await tokenFor(user.email);
    const results = await Promise.allSettled([1, 2].map(() => service.resetPassword({ token, newPassword: replacement, confirmPassword: replacement })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await saved(user.id)).sessionVersion).toBe(1);
  }, 20_000);

  it('reports email delivery failure without changing the sign-in address and keeps recovery generic', async () => {
    const { user, identity } = await account();
    send.mockRejectedValueOnce(new Error('Synthetic SMTP failure'));
    await expect(service.requestEmailChange({ email: randomUUID() + '@example.invalid', currentPassword: password }, identity)).rejects.toThrow('send');
    expect((await saved(user.id)).email).toBe(user.email);
    send.mockRejectedValueOnce(new Error('Synthetic SMTP failure'));
    await expect(service.forgotPassword({ email: user.email })).resolves.toHaveProperty('message');
  });
});
