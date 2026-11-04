import {
  Equals,
  IsBoolean,
} from 'class-validator';

export class ConfirmGuestBookingDto {
  @IsBoolean()
  @Equals(true)
  guestAgreed!: boolean;
}
