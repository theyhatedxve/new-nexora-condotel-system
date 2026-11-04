
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  roomNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  roomTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  floor?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
