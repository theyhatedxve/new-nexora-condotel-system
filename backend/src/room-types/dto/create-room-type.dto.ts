
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsInt()
  @Min(1)
  @Max(100)
  capacity!: number;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  baseRateCentavos!: number;
}
