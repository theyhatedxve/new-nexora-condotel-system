import { createHash } from 'node:crypto';

import { REFRESH_TOKEN_DAYS } from './auth.config.js';

export function hashRefreshToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

export function getRefreshExpiry(): Date {
  const expiry = new Date();

  expiry.setUTCDate(
    expiry.getUTCDate() + REFRESH_TOKEN_DAYS,
  );

  return expiry;
}
