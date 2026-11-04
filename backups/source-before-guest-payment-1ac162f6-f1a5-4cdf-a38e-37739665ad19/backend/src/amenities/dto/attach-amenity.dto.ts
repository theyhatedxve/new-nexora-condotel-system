
import { IsString, MinLength } from 'class-validator';

export class AttachAmenityDto {
  @IsString()
  @MinLength(1)
  amenityId!: string;
}
