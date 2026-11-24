import 'reflect-metadata';
import nodemailer from 'nodemailer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from './email.service.js';

describe('guest credential email delivery', () => {
  const sendMail = vi.fn(async (_message: unknown) => ({ accepted: ['guest@example.invalid'], rejected: [] as string[] }));
  const close = vi.fn();
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'synthetic-user');
    vi.stubEnv('SMTP_PASSWORD', 'synthetic-password');
    vi.stubEnv('SMTP_FROM', 'noreply@example.invalid');
    vi.stubEnv('AUTH_VERIFY_URL', 'http://localhost:5175/verify-email');
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', 'http://localhost:5175,http://localhost:5176');
    vi.stubEnv('AUTH_GUEST_ALLOWED_ORIGINS', 'http://localhost:5175');
    vi.stubEnv('AUTH_STAFF_ALLOWED_ORIGINS', 'http://localhost:5176');
    sendMail.mockClear(); close.mockClear();
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail, close } as never);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it.each(['RESET_PASSWORD', 'CHANGE_EMAIL'] as const)('delivers %s to the trusted guest origin with a fragment token', async (purpose) => {
    const token = 'a'.repeat(64);
    await new EmailService().sendGuestCredentialEmail('guest@example.invalid', token, purpose);
    const message = sendMail.mock.calls[0][0] as { to: { address: string }; text: string };
    expect(message.to.address).toBe('guest@example.invalid');
    expect(message.text).toContain(`http://localhost:5175/${purpose === 'RESET_PASSWORD' ? 'reset-password' : 'confirm-email'}#token=${token}`);
    expect(message.text).not.toContain('?token=');
    expect(message.text).toContain('30 minutes');
    expect(close).toHaveBeenCalledOnce();
  });

  it('refuses a staff-origin link and refuses non-HTTPS production links', async () => {
    vi.stubEnv('AUTH_VERIFY_URL', 'http://localhost:5176/verify-email');
    await expect(new EmailService().sendGuestCredentialEmail('guest@example.invalid', 'a'.repeat(64), 'RESET_PASSWORD')).rejects.toThrow();
    vi.stubEnv('AUTH_VERIFY_URL', 'http://localhost:5175/verify-email');
    vi.stubEnv('NODE_ENV', 'production');
    await expect(new EmailService().sendGuestCredentialEmail('guest@example.invalid', 'a'.repeat(64), 'RESET_PASSWORD')).rejects.toThrow();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('closes the transport and reports rejected delivery', async () => {
    sendMail.mockResolvedValueOnce({ accepted: [], rejected: ['guest@example.invalid'] });
    await expect(new EmailService().sendGuestCredentialEmail('guest@example.invalid', 'a'.repeat(64), 'CHANGE_EMAIL')).rejects.toThrow('not accepted');
    expect(close).toHaveBeenCalledOnce();
  });
});
