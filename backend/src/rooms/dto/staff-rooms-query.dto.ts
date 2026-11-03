import {
  Transform,
  type TransformFnParams,
} from 'class-transformer';

import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const STAFF_ROOM_STATUSES = [
  'READY',
  'CLEANING',
  'OCCUPIED',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
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

export class StaffRoomsQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(30)
  q?: string;

  @IsOptional()
  @IsIn(STAFF_ROOM_STATUSES)
  status?: typeof STAFF_ROOM_STATUSES[number];

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: 'true' | 'false';

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomTypeId?: string;

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
  limit = 20;
}