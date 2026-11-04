import { IsIn } from 'class-validator';

export class RecordGuestContactDto {
  @IsIn(['PHONE', 'EMAIL'])
  channel!: 'PHONE' | 'EMAIL';
}
