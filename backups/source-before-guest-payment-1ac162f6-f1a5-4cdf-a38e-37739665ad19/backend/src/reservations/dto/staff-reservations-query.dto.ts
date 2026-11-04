import {
  Transform,
  type TransformFnParams,
} from 'class-transformer';

import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const STAFF_RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'EXPIRED',
] as const;

function queryInteger(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value)
  ) {
    return Number.NaN;
  }

  return Number(value);
}

export class StaffReservationsQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(STAFF_RESERVATION_STATUSES)
  status?: typeof STAFF_RESERVATION_STATUSES[number];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkInFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkInTo?: string;

  @Transform(({ value }: TransformFnParams) =>
    queryInteger(value),
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @Transform(({ value }: TransformFnParams) =>
    queryInteger(value),
  )
  @IsInt()
  @IsIn([20, 50])
  limit = 50;
}