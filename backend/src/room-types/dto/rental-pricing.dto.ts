import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt,
  IsISO8601, IsString, Matches, Max, Min, ValidateNested,
} from 'class-validator';
import type { RentalType } from '../../generated/prisma/client.js';
import { MAX_RATE_CENTAVOS, MAX_ROOM_CAPACITY } from '../../common/validation/room-rate-capacity.service.js';
import { RENTAL_TYPES } from '../rental-pricing.policy.js';

export class RentalQuoteDto {
  @IsIn(RENTAL_TYPES)
  rentalType!: RentalType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  units = 1;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  arrivalDate!: string;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  arrivalTime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ROOM_CAPACITY)
  guests!: number;
}

export class RentalRateDto {
  @IsIn(RENTAL_TYPES)
  rentalType!: RentalType;

  @IsInt()
  @Min(1)
  @Max(MAX_RATE_CENTAVOS)
  rateCentavos!: number;

  @IsInt()
  @Min(0)
  @Max(MAX_RATE_CENTAVOS)
  extraPersonFeeCentavos = 0;

  @IsBoolean()
  isActive = true;
}

export class SaveRentalPricingDto {
  @IsString()
  @IsISO8601({ strict: true })
  updatedAt!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_ROOM_CAPACITY)
  includedOccupancy!: number;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => RentalRateDto)
  rates!: RentalRateDto[];
}
