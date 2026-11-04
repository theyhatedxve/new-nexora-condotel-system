import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  parsePhilippineDate,
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import { countNights, hasRoomEveryNight } from './availability-calculator.js';
import type { SearchAvailabilityDto } from './dto/search-availability.dto.js';

// Approved default. Change here if the property sets a different limit.
export const MAX_STAY_NIGHTS = 30;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // Only the approved single property is supported.
  private async getPropertyId(): Promise<string> {
    const properties = await this.prisma.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    return properties[0].id;
  }

  private parseStay(checkIn: string, checkOut: string) {
    const startDate = parsePhilippineDate(checkIn);
    const endDate = parsePhilippineDate(checkOut);

    if (startDate >= endDate) {
      throw new BadRequestException('Check-out must be after check-in.');
    }

    if (startDate < todayInPhilippines()) {
      throw new BadRequestException('Check-in cannot be in the past.');
    }

    const nights = countNights(startDate, endDate);

    if (nights > MAX_STAY_NIGHTS) {
      throw new BadRequestException(
        `A stay can be at most ${MAX_STAY_NIGHTS} nights.`,
      );
    }

    return { startDate, endDate, nights };
  }

  async search(query: SearchAvailabilityDto) {
    const { startDate, endDate, nights } = this.parseStay(
      query.checkIn,
      query.checkOut,
    );

    const propertyId = await this.getPropertyId();

    // Rooms in a usable status, with only the active blocks that touch the stay.
    const roomTypes = await this.prisma.roomType.findMany({
      where: {
        propertyId,
        isActive: true,
        capacity: { gte: query.guests },
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        baseRateCentavos: true,
        rooms: {
          where: {
            isActive: true,
            status: { notIn: ['MAINTENANCE', 'OUT_OF_SERVICE'] },
          },
          select: {
            roomBlocks: {
              where: {
                canceledAt: null,
                startDate: { lt: endDate },
                endDate: { gt: startDate },
              },
              select: { startDate: true, endDate: true },
            },
          },
        },
      },
      orderBy: [{ baseRateCentavos: 'asc' }, { name: 'asc' }],
    });

    // Reservations that hold inventory. A pending reservation holds a room
    // unless its hold has expired.
    const reservations = await this.prisma.reservation.findMany({
      where: {
        roomTypeId: { in: roomTypes.map((roomType) => roomType.id) },
        checkInDate: { lt: endDate },
        checkOutDate: { gt: startDate },
        OR: [
          { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          {
            status: 'PENDING',
            OR: [
              { holdExpiresAt: null },
              { holdExpiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
      select: {
        roomTypeId: true,
        checkInDate: true,
        checkOutDate: true,
      },
    });

    return roomTypes.map((roomType) => ({
      id: roomType.id,
      name: roomType.name,
      capacity: roomType.capacity,
      available: hasRoomEveryNight({
        rooms: roomType.rooms.map((room) => ({ blocks: room.roomBlocks })),
        reservations: reservations.filter(
          (reservation) => reservation.roomTypeId === roomType.id,
        ),
        startDate,
        endDate,
      }),
      nights,
      nightlyRateCentavos: roomType.baseRateCentavos,
      // The price is calculated here. The frontend only displays it.
      totalAmountCentavos: roomType.baseRateCentavos * nights,
    }));
  }
}