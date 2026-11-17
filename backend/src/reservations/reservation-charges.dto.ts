import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString,
  IsUUID, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export const CHARGE_ACTIONS = [
  'PROPOSE_DAMAGE', 'PROPOSE_EXTENSION', 'APPROVE', 'REJECT',
  'COLLECT', 'APPLY_EXTENSION', 'REFUND_UNFULFILLED_EXTENSION',
] as const;

export class ReservationChargeCommandDto {
  @IsUUID('4') requestId!: string;
  @IsIn(CHARGE_ACTIONS) action!: typeof CHARGE_ACTIONS[number];
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) chargeId?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  description?: string;
  @IsOptional() @IsString() @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  evidenceNotes?: string;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) amountCentavos?: number;
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) @MaxLength(40)
  requestedDepartureAt?: string;
  @IsOptional() @IsBoolean() moneyReceived?: boolean;
  @IsOptional() @IsBoolean() moneyReturned?: boolean;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  reason?: string;
}
export class ReservationChargeQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  page: number = 1;
}
