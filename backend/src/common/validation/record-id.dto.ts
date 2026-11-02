import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RecordIdDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  id!: string;
}