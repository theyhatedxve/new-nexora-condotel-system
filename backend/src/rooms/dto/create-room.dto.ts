
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  roomNumber!: string;

  @IsString()
  @MinLength(1)
  roomTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  floor?: string | null;
}
