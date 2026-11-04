
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  parsePhilippineDate,
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import { RoomRateCapacityService } from
  '../common/validation/room-rate-capacity.service.js';

import { MAX_STAY_NIGHTS } from
  '../availability/availability.service.js';

import type { CreateReservationDto } from
  './dto/create-reservation.dto.js';

  import type { Prisma } from '../generated/prisma/client.js';

const MILLISECONDS_PER_DAY = 86_400_000;

@Injectable()
export class ReservationValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateCapacity: RoomRateCapacityService,
  ) {}

  async validate(
  input: CreateReservationDto,
  db: Pick<
    Prisma.TransactionClient,
    'property' | 'roomType'
  > = this.prisma,
) {
    // 1. Parse real Philippine calendar dates.
    const checkInDate = parsePhilippineDate(input.checkIn);
    const checkOutDate = parsePhilippineDate(input.checkOut);

    if (checkInDate < todayInPhilippines()) {
      throw new BadRequestException(
        'Check-in cannot be in the past.',
      );
    }

    if (checkOutDate <= checkInDate) {
      throw new BadRequestException(
        'Check-out must be after check-in.',
      );
    }

    const nights =
      (checkOutDate.getTime() - checkInDate.getTime()) /
      MILLISECONDS_PER_DAY;

    if (nights > MAX_STAY_NIGHTS) {
      throw new BadRequestException(
        `A stay can be at most ${MAX_STAY_NIGHTS} nights.`,
      );
    }

    // 2. Validate the basic guest-count range.
    this.rateCapacity.validateCapacity(input.guests);

    if (
      typeof input.roomTypeId !== 'string' ||
      input.roomTypeId.trim().length === 0
    ) {
      throw new BadRequestException(
        'A room type must be selected.',
      );
    }

    // 3. Enforce NEXORA's one-property architecture.
    const properties = await db.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const propertyId = properties[0].id;

    // 4. Load only an active room type at that property.
    const roomType = await db.roomType.findFirst({
      where: {
        id: input.roomTypeId,
        propertyId,
        isActive: true,
      },
      select: {
        id: true,
        capacity: true,
        baseRateCentavos: true,
      },
    });

    if (!roomType) {
      throw new NotFoundException(
        'Room type not found.',
      );
    }

    // 5. Enforce the room type's actual guest capacity.
    this.rateCapacity.validateGuestCount(
      input.guests,
      roomType.capacity,
    );

    // The existing rate must also be valid.
    this.rateCapacity.validateBaseRate(
      roomType.baseRateCentavos,
    );

    // This is validated input, NOT a reservation or quote.
    return {
      propertyId,
      roomTypeId: roomType.id,
      checkInDate,
      checkOutDate,
      guestCount: input.guests,
      nights,
    };
  }
}
