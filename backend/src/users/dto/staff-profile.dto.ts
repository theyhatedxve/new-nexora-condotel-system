import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail, IsISO8601, IsString, Matches, MaxLength, MinLength,
} from 'class-validator';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ProfileVersionDto {
  @IsString()
  @IsISO8601({ strict: true })
  updatedAt!: string;
}

export class UpdateMyProfileDto extends ProfileVersionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+().\s-]*$/)
  phone!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address!: string;
}

export class ChangeMyEmailDto extends ProfileVersionDto {
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;
}

export class ChangeMyPasswordDto extends ProfileVersionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  confirmPassword!: string;
}
