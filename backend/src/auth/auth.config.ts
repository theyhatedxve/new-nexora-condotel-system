
import { randomBytes } from 'node:crypto';

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_DAYS = 7;
export const REFRESH_COOKIE_NAME = 'nexora_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: REFRESH_COOKIE_PATH,
};

export function getJwtSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET must contain at least 32 bytes.',
    );
  }

  return secret;
}

export function getAllowedOrigins(): string[] {
  const value = process.env.AUTH_ALLOWED_ORIGINS;

  if (!value) {
    throw new Error('AUTH_ALLOWED_ORIGINS must be configured.');
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}
