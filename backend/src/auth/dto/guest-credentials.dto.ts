import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class GuestRecoveryEmailDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class GuestEmailChangeDto extends GuestRecoveryEmailDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  currentPassword!: string;
}

export class GuestCredentialTokenDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}

export class GuestNewPasswordDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  confirmPassword!: string;
}

export class GuestPasswordChangeDto extends GuestNewPasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  currentPassword!: string;
}

export class GuestPasswordResetDto extends GuestNewPasswordDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}
