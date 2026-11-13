import {
  Transform,
  type TransformFnParams,
} from 'class-transformer';

import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

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

export class GuestReservationListDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    queryInteger(value),
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    queryInteger(value),
  )
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 20;
}
