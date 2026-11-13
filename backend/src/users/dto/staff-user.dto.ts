import {
  Transform,
  type TransformFnParams,
} from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

import {
  STAFF_ROLES,
  STAFF_STATUSES,
  type StaffRole,
  type StaffStatus,
} from '../staff-user.definition.js';

function trimmed({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizedEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : value;
}

function queryInteger({ value }: TransformFnParams): number {
  if (typeof value === 'number') {
    return value;
  }

  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : Number.NaN;
}

export class StaffListQueryDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @IsOptional()
  @IsIn(STAFF_STATUSES)
  status?: StaffStatus;

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

export class CreateStaffUserDto {
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @Transform(normalizedEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(STAFF_ROLES)
  role!: StaffRole;

  @IsIn(['INVITATION', 'TEMPORARY_PASSWORD'])
  setupMethod!: 'INVITATION' | 'TEMPORARY_PASSWORD';

  @ValidateIf(
    (input: CreateStaffUserDto) =>
      input.setupMethod === 'TEMPORARY_PASSWORD' ||
      input.temporaryPassword !== undefined,
  )
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword?: string;
}

export class StaffVersionDto {
  @IsString()
  @IsISO8601({ strict: true })
  updatedAt!: string;
}

export class UpdateStaffUserDto extends StaffVersionDto {
  @Transform(trimmed)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsIn(STAFF_ROLES)
  role!: StaffRole;

  @IsIn(STAFF_STATUSES)
  status!: StaffStatus;
}
