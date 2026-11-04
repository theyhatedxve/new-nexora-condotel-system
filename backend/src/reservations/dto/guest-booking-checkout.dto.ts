import {
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GuestBookingCheckoutScopeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  expectedReservationNumber!: string;
}

export class CreateGuestBookingCheckoutDto
  extends GuestBookingCheckoutScopeDto {
  @IsUUID('4')
  requestId!: string;
}