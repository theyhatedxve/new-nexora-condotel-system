import { Equals, IsInt, IsUUID, Max, Min } from 'class-validator';

export class RecordPropertyPaymentDto {
  @IsUUID('4')
  requestId!: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amountCentavos!: number;

  @Equals(true)
  collectionConfirmed!: boolean;
}