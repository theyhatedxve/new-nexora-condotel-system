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

function trimmed(value: unknown): unknown {
  return typeof value === 'string'
    ? value.trim()
    : value;
}

export class AuditListQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    trimmed(value),
  )
  @IsString()
  @MaxLength(100)
  action?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    trimmed(value),
  )
  @IsString()
  @MaxLength(100)
  entityType?: string;

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