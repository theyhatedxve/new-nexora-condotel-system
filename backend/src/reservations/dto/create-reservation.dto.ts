
import {
  IsEmail,
  IsIn,
  ValidateIf,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import type { RentalType } from '../../generated/prisma/client.js';
import { RENTAL_TYPES } from '../../room-types/rental-pricing.policy.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateReservationDto {
  @IsString()
  @MinLength(1)
  roomTypeId!: string;

  @IsString()
  @Matches(DATE_PATTERN)
  checkIn!: string;

  @IsString()
  @Matches(DATE_PATTERN)
  checkOut!: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  guests!: number;

  @ValidateIf((value: { rentalType?: unknown; rentalUnits?: unknown }) =>
    value.rentalType !== undefined || value.rentalUnits !== undefined)
  @IsIn(RENTAL_TYPES)
  rentalType?: RentalType;

  @ValidateIf((value: { rentalType?: unknown; rentalUnits?: unknown }) =>
    value.rentalType !== undefined || value.rentalUnits !== undefined)
  @IsInt()
  @Min(1)
  @Max(30)
  rentalUnits?: number;

  @ValidateIf((value: { rentalType?: unknown; arrivalTime?: unknown }) =>
    value.rentalType !== undefined || value.arrivalTime !== undefined)
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  arrivalTime?: string;

  // Primary guest profile.
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
