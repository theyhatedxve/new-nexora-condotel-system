
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  MAX_RATE_CENTAVOS,
  MAX_ROOM_CAPACITY,
} from '../../common/validation/room-rate-capacity.service.js';

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
  @Max(MAX_ROOM_CAPACITY)
  capacity!: number;

  @IsInt()
  @Min(1)
  @Max(MAX_RATE_CENTAVOS)
  baseRateCentavos!: number;
  
}
