import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CancelReservationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}