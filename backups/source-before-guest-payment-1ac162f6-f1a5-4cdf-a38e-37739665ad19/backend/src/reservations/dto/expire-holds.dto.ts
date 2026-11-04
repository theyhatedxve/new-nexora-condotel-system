import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import {
  MAX_EXPIRATION_BATCH,
} from '../reservation-lifecycle.js';

export class ExpireHoldsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_EXPIRATION_BATCH)
  limit?: number;
}