import {
  Equals,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class StayAssignmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  assignmentId!: string;
}

export class CheckInDto extends StayAssignmentDto {
  // Staff confirmation that the property's
  // identity-check procedure was completed.
  @IsBoolean()
  @Equals(true)
  identityVerified!: boolean;
}