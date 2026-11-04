import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AssignRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roomId!: string;
}