import { InternalServerErrorException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { DAY_MS, arrivalReminderDue } from '../reservations/policies/booking-reminder.policy.js';
import { enqueueArrivalReminderInTx } from './booking-updates.queue.js';

export async function enqueueDueArrivalReminders(
  prisma: PrismaService, now: Date, cursor?: string,
): Promise<string | undefined> {
  return prisma.$transaction(async (tx) => {
    const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
    if (properties.length !== 1) {
      throw new InternalServerErrorException('Exactly one property must be configured.');
    }
    const until = new Date(now.getTime() + DAY_MS);
    const rows = await tx.reservation.findMany({
      where: {
        ...(cursor ? { id: { gt: cursor } } : {}),
        roomType: { propertyId: properties[0].id },
        status: 'CONFIRMED', confirmedAt: { lte: now },
        actualArrivalAt: null, actualDepartureAt: null,
        OR: [
          { expectedArrivalAt: { gt: now, lte: until } },
          { expectedArrivalAt: null, scheduledArrivalAt: { gt: now, lte: until } },
        ],
      },
      orderBy: { id: 'asc' }, take: 100,
    });
    for (const booking of rows) {
      const arrival = arrivalReminderDue(booking, now);
      if (arrival) await enqueueArrivalReminderInTx(tx, booking.id, arrival);
    }
    return rows.length === 100 ? rows[rows.length - 1].id : undefined;
  });
}
