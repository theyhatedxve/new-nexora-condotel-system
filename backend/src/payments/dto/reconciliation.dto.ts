import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ReconcilePaymentDto {
  @IsUUID('4')
  requestId: string;

  @Matches(/^evt_[A-Za-z0-9_]{1,96}$/)
  eventId: string;

  @IsOptional()
  @IsBoolean()
  acknowledgeLateCapture?: boolean;
}

export class ReconcileRefundDto {
  @IsUUID('4')
  requestId: string;

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