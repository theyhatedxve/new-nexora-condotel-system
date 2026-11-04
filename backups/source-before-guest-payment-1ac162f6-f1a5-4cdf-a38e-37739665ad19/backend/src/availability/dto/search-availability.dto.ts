import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class SearchAvailabilityDto {
  @IsString()
  @Matches(DATE_PATTERN)
  checkIn!: string;

  @IsString()
  @Matches(DATE_PATTERN)
  checkOut!: string;

  // Query-string values arrive as text, so convert before validating.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  guests!: number;
}