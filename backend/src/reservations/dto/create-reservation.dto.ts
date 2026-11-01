
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateReservationDto {
  @IsString()
  @MinLength(1)
  roomTypeId!: string;

  @IsString()
  @Matches(DATE_PATTERN)
  checkIn!: string;

  @IsString()
  @Matches(DATE_PATTERN)
  checkOut!: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  guests!: number;

  // Primary guest details for accountless booking.
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
