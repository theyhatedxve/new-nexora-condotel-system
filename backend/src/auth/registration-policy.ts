import { createHash, randomBytes } from 'node:crypto';

export const VERIFICATION_LIFETIME_MS = 30 * 60 * 1000;

export const REGISTRATION_ACKNOWLEDGMENT = {
  message: 'Registration received.',
  accountStatus: 'PENDING' as const,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

export function getVerificationExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_LIFETIME_MS);
}
