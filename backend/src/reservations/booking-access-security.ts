import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { hash, validToken } from './reservation-crypto.js';

// Compatibility exports for legacy consumers awaiting cleanup.
export { hash, validToken } from './reservation-crypto.js';
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
