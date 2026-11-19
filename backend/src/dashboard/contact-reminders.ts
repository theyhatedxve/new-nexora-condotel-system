import type { Prisma } from '../generated/prisma/client.js';
import { FOLLOW_UP_ACTION, WEEK_MS, dueContactReminder } from '../reservations/policies/booking-reminder.policy.js';

export async function loadContactReminders(
  tx: Prisma.TransactionClient, propertyId: string, now: Date,
) {
  const items: Array<{
    id: string; reservationNumber: string;
    guest: { firstName: string; lastName: string };
    purpose: string; dueAt: Date; expectedArrivalAt: Date;
  }> = [];
  let total = 0;
  let cursor: string | undefined;
  const until = new Date(now.getTime() + WEEK_MS);
  for (;;) {
    const rows = await tx.reservation.findMany({
      where: {
        ...(cursor ? { id: { gt: cursor } } : {}),
        roomType: { propertyId }, status: 'CONFIRMED', confirmedAt: { lte: now },
        actualArrivalAt: null, actualDepartureAt: null,
        OR: [
          { expectedArrivalAt: { gt: now, lte: until } },
          { expectedArrivalAt: null, scheduledArrivalAt: { gt: now, lte: until } },
        ],
      },
      include: { guest: { select: { firstName: true, lastName: true } } },
      orderBy: { id: 'asc' }, take: 100,
    });
    if (rows.length === 0) break;
    const attempts = await tx.auditLog.findMany({
      where: {
        entityType: 'Reservation', entityId: { in: rows.map((row) => row.id) },
        action: FOLLOW_UP_ACTION,
        createdAt: { gte: new Date(now.getTime() - WEEK_MS), lte: now },
      },
      select: { entityId: true, createdAt: true, detailsJson: true },
    });
    for (const booking of rows) {
      const reminder = dueContactReminder(
        booking, attempts.filter((attempt) => attempt.entityId === booking.id), now,
      );
      if (!reminder) continue;
      total += 1;
      items.push({
        id: booking.id, reservationNumber: booking.reservationNumber,
        guest: booking.guest, ...reminder,
      });
      // Retain only the earliest twenty tasks while counting all matches.
      items.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime() || a.id.localeCompare(b.id));
      if (items.length > 20) items.pop();
    }
    if (rows.length < 100) break;
    cursor = rows[rows.length - 1].id;
  }
  return { items, total, limit: 20 };
}
