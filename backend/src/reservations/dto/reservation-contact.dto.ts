import { Type, Transform } from 'class-transformer';
import {
  IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min,
} from 'class-validator';

export const CONTACT_PURPOSES = [
  'INITIAL_FOLLOW_UP', 'ONE_WEEK_REMINDER', 'ONE_DAY_REMINDER',
  'SHORT_NOTICE', 'ARRIVAL_FOLLOW_UP',
] as const;
export const CONTACT_RESULTS = [
  'REACHED', 'NO_ANSWER', 'LEFT_MESSAGE', 'UNREACHABLE',
] as const;

export class ReservationContactDto {
  @IsUUID('4')
  requestId!: string;

  @IsIn(['PHONE', 'EMAIL'])
  channel!: 'PHONE' | 'EMAIL';

  @IsIn(CONTACT_PURPOSES)
  purpose!: typeof CONTACT_PURPOSES[number];

  @IsIn(CONTACT_RESULTS)
  result!: typeof CONTACT_RESULTS[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  expectedArrivalAt?: string;
}

export class ReservationContactQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;
}
