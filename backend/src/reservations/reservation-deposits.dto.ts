import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsInt, IsOptional, IsString,
  IsUUID, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export const DEPOSIT_ACTIONS = [
  'COLLECT', 'DEDUCT', 'AUTHORIZE_RETURN', 'RETURN_CASH', 'RESTORE_EXTENSION',
] as const;

export class ReservationDepositCommandDto {
  @IsUUID('4') requestId!: string;
  @IsIn(DEPOSIT_ACTIONS) action!: typeof DEPOSIT_ACTIONS[number];
  @IsString() @MinLength(3) @MaxLength(500)
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  reason!: string;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) amountCentavos?: number;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) chargeId?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) authorizationId?: string;
  @IsOptional() @IsBoolean() moneyReceived?: boolean;
  @IsOptional() @IsBoolean() moneyReturned?: boolean;
}
export class ReservationDepositQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  page: number = 1;
}
