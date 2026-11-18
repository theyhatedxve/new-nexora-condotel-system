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

function queryInteger({ value }: TransformFnParams): number {
  if (typeof value === 'number') {
    return value;
  }

  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : Number.NaN;
}

export class GuestAccountsQueryDto {
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'DISABLED'])
  status?: 'PENDING' | 'ACTIVE' | 'DISABLED';

  @Transform(queryInteger)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @Transform(queryInteger)
  @IsInt()
  @IsIn([20, 50])
  limit = 20;
}