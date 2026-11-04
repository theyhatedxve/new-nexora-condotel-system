import { createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export function hash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export function validToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
export function denied(): never {
  throw new NotFoundException('Booking access is invalid or expired.');
}
export async function requireBookingSession(
  db: Pick<Prisma.TransactionClient, 'reservationAccessSession'>,
  cookie: unknown,
) {
  if (!validToken(cookie)) denied();
  const session = await db.reservationAccessSession.findFirst({
    where: { tokenHash: hash(cookie), revokedAt: null, expiresAt: { gt: new Date() } },
    select: { reservationId: true, expiresAt: true },
  });
  if (!session) denied();
  return session;
}
