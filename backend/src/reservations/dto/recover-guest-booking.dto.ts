import {
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class RecoverGuestBookingDto {
  @IsUUID('4')
  requestId!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  recoveryToken!: string;
}