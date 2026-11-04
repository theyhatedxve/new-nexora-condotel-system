import {
  Equals,
  IsBoolean,
  IsIn,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

import {
  CreateReservationDto,
} from './create-reservation.dto.js';

export const GUEST_PAYMENT_METHODS = [
  'PAY_AT_PROPERTY',
  'PAYMONGO',
] as const;

export type GuestPaymentMethod =
  typeof GUEST_PAYMENT_METHODS[number];

export class CreateGuestBookingDto
  extends CreateReservationDto {
  @IsUUID('4')
  requestId!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  recoveryToken!: string;

  @IsIn(GUEST_PAYMENT_METHODS)
  paymentPreference!: GuestPaymentMethod;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  arrivalTime!: string;

  @IsBoolean()
  @Equals(true)
  acknowledgmentAccepted!: boolean;
}