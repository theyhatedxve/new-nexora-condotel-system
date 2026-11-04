import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestBookingAccessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  reservationNumber!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ExchangeBookingAccessDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}