import { IsUUID } from 'class-validator';

export class CreateCheckoutDto {
  @IsUUID('4')
  requestId!: string;
}
