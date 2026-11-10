import { BadRequestException } from '@nestjs/common';

import {
  parsePhilippineDate,
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';
import { countNights } from './availability-calculator.js';

export const MAX_STAY_NIGHTS = 30;

export function parseAvailabilityStay(checkIn: string, checkOut: string) {
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
