import { createHash } from 'node:crypto';

export function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function validToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
