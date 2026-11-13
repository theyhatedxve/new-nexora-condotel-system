import {
  Transform,
  type TransformFnParams,
} from 'class-transformer';

import {
  IsIn,
  IsInt,
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
  @IsIn([20])
  limit = 20;
}
