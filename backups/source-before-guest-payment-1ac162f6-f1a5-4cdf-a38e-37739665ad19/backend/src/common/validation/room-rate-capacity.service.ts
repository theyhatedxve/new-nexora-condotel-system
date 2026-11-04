
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

export const MAX_RATE_CENTAVOS = 2_147_483_647;
export const MAX_ROOM_CAPACITY = 2_147_483_647;

@Injectable()
export class RoomRateCapacityService {
  validateBaseRate(value: number): number {
    if (
      !Number.isInteger(value) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > MAX_RATE_CENTAVOS
    ) {
      throw new BadRequestException(
        `Base rate must be an integer from 1 to ${MAX_RATE_CENTAVOS} centavos.`,
      );
    }

    return value;
  }

  validateCapacity(value: number): number {
    if (
      !Number.isInteger(value) ||
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > MAX_ROOM_CAPACITY
    ) {
      throw new BadRequestException(
        `Capacity must be an integer from 1 to ${MAX_ROOM_CAPACITY}.`,
      );
    }

    return value;
  }

  validateGuestCount(
    guestCount: number,
    roomCapacity: number,
  ): void {
    this.validateCapacity(roomCapacity);

    if (
      !Number.isInteger(guestCount) ||
      !Number.isSafeInteger(guestCount) ||
      guestCount < 1
    ) {
      throw new BadRequestException(
        'Guest count must be a positive integer.',
      );
    }

    if (guestCount > roomCapacity) {
      throw new BadRequestException(
        'Guest count exceeds room-type capacity.',
      );
    }
  }

  validateRoomType(input: {
    baseRateCentavos: number;
    capacity: number;
  }): void {
    this.validateBaseRate(input.baseRateCentavos);
    this.validateCapacity(input.capacity);
  }
}
