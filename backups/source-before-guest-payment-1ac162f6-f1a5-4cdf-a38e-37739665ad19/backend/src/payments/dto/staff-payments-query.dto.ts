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
} from 'class-validator';

export const STAFF_PAYMENT_METHODS = [
  'PAYMONGO',
  'PAY_AT_PROPERTY',
] as const;

export const STAFF_PAYMENT_STATUSES = [
  'UNPAID',
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
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

export class StaffPaymentsQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(STAFF_PAYMENT_METHODS)
  method?: typeof STAFF_PAYMENT_METHODS[number];

  @IsOptional()
  @IsIn(STAFF_PAYMENT_STATUSES)
  status?: typeof STAFF_PAYMENT_STATUSES[number];

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