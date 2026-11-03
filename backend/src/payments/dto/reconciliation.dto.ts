import {
  Transform,
  Type,
  type TransformFnParams,
} from 'class-transformer';

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';




export class ReconcilePaymentDto {
  @IsUUID('4')
  requestId!: string;

  @Matches(/^evt_[A-Za-z0-9_]{1,96}$/)
  eventId!: string;

  @IsOptional()
  @IsBoolean()
  acknowledgeLateCapture?: boolean;
}

export class ReconcileRefundDto {
  @IsUUID('4')
  requestId!: string;

  @IsOptional()
  @Matches(/^ref_[A-Za-z0-9_]{1,96}$/)
  providerRefundId?: string;
}

export class ReconciliationListDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class ReconciliationRequestParamsDto {
  @IsUUID('4')
  requestId!: string;
}

export class ReconciliationStatusQueryDto {
  @IsIn(['payment', 'refund'])
  kind!: 'payment' | 'refund';

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  targetId!: string;

  @IsOptional()
  @Matches(/^evt_[A-Za-z0-9_]{1,96}$/)
  eventId?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  acknowledgeLateCapture?: 'true' | 'false';

  @IsOptional()
  @Matches(/^ref_[A-Za-z0-9_]{1,96}$/)
  providerRefundId?: string;
}

function reconciliationPageInteger(value: unknown): number {
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

export class ReconciliationPagesDto {
  @Transform(({ value }: TransformFnParams) =>
    reconciliationPageInteger(value),
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  paymentPage = 1;

  @Transform(({ value }: TransformFnParams) =>
    reconciliationPageInteger(value),
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  refundPage = 1;

  @Transform(({ value }: TransformFnParams) =>
    reconciliationPageInteger(value),
  )
  @IsInt()
  @Min(1)
  @Max(10000)
  eventPage = 1;

  @Transform(({ value }: TransformFnParams) =>
    reconciliationPageInteger(value),
  )
  @IsInt()
  @IsIn([20, 50])
  limit = 20;
}