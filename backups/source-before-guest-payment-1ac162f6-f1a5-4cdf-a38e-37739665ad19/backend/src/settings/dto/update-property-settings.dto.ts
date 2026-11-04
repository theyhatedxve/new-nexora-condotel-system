import {
  Transform,
  type TransformFnParams,
} from 'class-transformer';

import {
  IsEmail,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

function requiredText(value: unknown): unknown {
  return typeof value === 'string'
    ? value.trim()
    : value;
}

function optionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim() || null;
}

export class UpdatePropertySettingsDto {
  @Transform(({ value }: TransformFnParams) =>
    requiredText(value),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @Transform(({ value }: TransformFnParams) =>
    requiredText(value),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address!: string;

  @Transform(({ value }: TransformFnParams) =>
    requiredText(value),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @Transform(({ value }: TransformFnParams) =>
    requiredText(value),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  province!: string;

  @Transform(({ value }: TransformFnParams) =>
    requiredText(value),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @Transform(({ value }: TransformFnParams) =>
    optionalText(value),
  )
  @ValidateIf(
    (_object: unknown, value: unknown) =>
      value !== null,
  )
  @IsString()
  @MaxLength(30)
  phone!: string | null;

  @Transform(({ value }: TransformFnParams) =>
    optionalText(value),
  )
  @ValidateIf(
    (_object: unknown, value: unknown) =>
      value !== null,
  )
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string | null;

  @Transform(({ value }: TransformFnParams) =>
    optionalText(value),
  )
  @ValidateIf(
    (_object: unknown, value: unknown) =>
      value !== null,
  )
  @IsString()
  @MaxLength(2000)
  description!: string | null;

  @IsString()
  @IsISO8601({ strict: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  )
  updatedAt!: string;
}