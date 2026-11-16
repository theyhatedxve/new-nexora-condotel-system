import { inventoryReservationWhere } from '../reservations/inventory-reservation.js';
import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { parseAvailabilityStay } from './availability-stay.js';
import { parsePhilippineDate, todayInPhilippines } from '../common/validation/philippine-date-range.js';
import { blockWindow, calendarInstant, reservationWindow } from '../common/inventory/reservation-window.js';
import { assertAllocatable, connectedStays, type Stay } from '../reservations/room-allocation.js';
import { reservationRentalQuote } from '../reservations/rental-reservation.js';
import type { SearchAvailabilityDto } from './dto/search-availability.dto.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPropertyId(db: Prisma.TransactionClient): Promise<string> {
    const properties = await db.property.findMany({ select: { id: true }, take: 2 });
    if (properties.length !== 1) {
      throw new InternalServerErrorException('Exactly one property must be configured.');
    }
    return properties[0].id;
  }

  async search(query: SearchAvailabilityDto) {
    const typed = query.rentalType !== undefined || query.rentalUnits !== undefined;
    const legacy = typed ? null : parseAvailabilityStay(query.checkIn, query.checkOut);
    if (parsePhilippineDate(query.checkIn) < todayInPhilippines()) {
      throw new BadRequestException('Check-in cannot be in the past.');
    }
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const propertyId = await this.getPropertyId(tx);
      const roomTypes = await tx.roomType.findMany({
        where: { propertyId, isActive: true, capacity: { gte: query.guests } },
        include: {
          rentalRates: true,
          rooms: {
            where: {
              isActive: true, status: { notIn: ['MAINTENANCE', 'OUT_OF_SERVICE'] },
            },
            include: { roomBlocks: { where: { canceledAt: null } } },
          },
        },
        orderBy: [{ baseRateCentavos: 'asc' }, { name: 'asc' }],
      });
      const ids = roomTypes.map((room) => room.id);
      // Include neighboring commitments: a whole-stay room must remain possible.
      const bookings = await tx.reservation.findMany({
        where: {
          OR: [
            { roomTypeId: { in: ids } },
            { roomAssignments: { some: {
              releasedAt: null, room: { roomTypeId: { in: ids } },
            } } },
          ],
          AND: [inventoryReservationWhere(now)],
        },
        include: { roomAssignments: { where: { releasedAt: null } } },
      });
      return roomTypes.flatMap((room) => {
        // Disabled/missing optional rates remove that category from typed searches.
        if (typed && query.rentalType !== 'NIGHTLY' &&
            !room.rentalRates.some((rate) => rate.rentalType === query.rentalType && rate.isActive)) {
          return [];
        }
        if (typed && room.rentalRates.some(
          (rate) => rate.rentalType === query.rentalType && !rate.isActive,
        )) return [];
        const quote = typed ? reservationRentalQuote(query, room, now) : null;
        const requested: Stay = {
          id: 'availability-request',
          start: quote ? new Date(quote.scheduledArrivalAt) : calendarInstant(legacy!.startDate),
          end: quote ? new Date(quote.scheduledDepartureAt) : calendarInstant(legacy!.endDate),
          roomIds: [],
          readyOnly: !typed && legacy!.startDate.getTime() === todayInPhilippines().getTime(),
        };
        const existing: Stay[] = bookings.filter((booking) =>
          booking.roomTypeId === room.id ||
          booking.roomAssignments.some((assignment) => room.rooms.some((item) => item.id === assignment.roomId)),
        ).map((booking) => ({
          id: booking.id,
          ...reservationWindow(booking),
          roomIds: booking.roomAssignments.map((assignment) => assignment.roomId),
        }));
        let available = true;
        try {
          assertAllocatable(room.rooms.map((item) => ({
            id: item.id, status: item.status, blocks: item.roomBlocks.map(blockWindow),
          })), connectedStays(requested, existing));
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
          available = false;
        }
        return [{
          id: room.id, name: room.name, capacity: room.capacity, available,
          nightlyRateCentavos: room.baseRateCentavos,
          ...(quote ? {
            ...quote, rentalUnits: quote.units, nights: null,
            quoteOnly: true, inventoryChecked: true,
          } : {
            nights: legacy!.nights,
            totalAmountCentavos: room.baseRateCentavos * legacy!.nights,
          }),
        }];
      });
    });
  }
}
export { MAX_STAY_NIGHTS } from './availability-stay.js';
