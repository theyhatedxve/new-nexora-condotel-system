import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';

import type { RentalType } from '../../generated/prisma/client.js';
import { RENTAL_TYPES } from '../../room-types/rental-pricing.policy.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class SearchAvailabilityDto {
  @IsString()
  @Matches(DATE_PATTERN)
  checkIn!: string;

  @IsString()
  @Matches(DATE_PATTERN)
  checkOut!: string;

  @ValidateIf((value: { rentalType?: unknown; rentalUnits?: unknown }) =>
    value.rentalType !== undefined || value.rentalUnits !== undefined)
  @IsIn(RENTAL_TYPES)
  rentalType?: RentalType;

  @ValidateIf((value: { rentalType?: unknown; rentalUnits?: unknown }) =>
    value.rentalType !== undefined || value.rentalUnits !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  rentalUnits?: number;

  @ValidateIf((value: { rentalType?: unknown; arrivalTime?: unknown }) =>
    value.rentalType !== undefined || value.arrivalTime !== undefined)
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  arrivalTime?: string;

  // Query-string values arrive as text, so convert before validating.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  guests!: number;
}
