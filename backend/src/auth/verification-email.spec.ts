import { Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EmailService } from './email.service.js';

beforeEach(() => {
  vi.stubEnv('SMTP_HOST', 'smtp.example.invalid');
  vi.stubEnv('SMTP_PORT', '2525');
  vi.stubEnv('SMTP_USER', 'synthetic-user');
  vi.stubEnv('SMTP_PASSWORD', 'synthetic-key');
  vi.stubEnv('SMTP_FROM', 'sender@example.invalid');
  vi.stubEnv('AUTH_VERIFY_URL', 'https://guest.example.invalid/verify-email');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it.each([
  [['guest@example.invalid'], 'Guest verification email accepted by SMTP.'],
  [[], 'Guest verification email was not accepted by SMTP.'],
])('reports SMTP acceptance based on the relay response (%j)', async (accepted, expected) => {
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  const sendMail = vi.fn().mockResolvedValue({ accepted });
  vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail, close: vi.fn() } as never);

  await new EmailService().sendVerificationEmail('guest@example.invalid', 'verification-token');

  expect(log.mock.calls[0]).toEqual(['Guest verification email SMTP send attempted.']);
  expect(log.mock.invocationCallOrder[0]).toBeLessThan(sendMail.mock.invocationCallOrder[0]);
  expect(accepted.length ? log.mock.calls.slice(1) : warn.mock.calls).toEqual([[expected]]);
});

it.each([
  ['EAUTH', 'authentication'],
  ['ETIMEDOUT', 'connection'],
  ['ETLS', 'tls'],
  ['EENVELOPE', 'message rejected'],
  ['untrusted secret text', 'unknown'],
])('logs a safe category for SMTP error %s', async (code, category) => {
  const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  const close = vi.fn();
  const error = Object.assign(new Error('synthetic-key guest@example.invalid verification-token'), { code });
  vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
    sendMail: vi.fn().mockRejectedValue(error), close,
  } as never);

  await expect(new EmailService().sendVerificationEmail('guest@example.invalid', 'verification-token'))
    .rejects.toBe(error);
  expect(warn.mock.calls).toEqual([[`Guest verification email failed (${category}).`]]);
  expect(close).toHaveBeenCalledOnce();
});

it.each([
  ['SMTP_HOST', '', 'SMTP configuration'],
  ['AUTH_VERIFY_URL', 'invalid-secret-url', 'verification URL configuration'],
])('logs a safe configuration category for %s', async (variable, value, category) => {
  const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  vi.stubEnv(variable, value);

  await expect(new EmailService().sendVerificationEmail('guest@example.invalid', 'verification-token'))
    .rejects.toThrow();
  expect(warn.mock.calls).toEqual([[`Guest verification email failed (${category}).`]]);
});
