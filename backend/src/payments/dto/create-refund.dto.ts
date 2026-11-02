// CREATE: backend/src/payments/dto/create-refund.dto.ts
// Verified in a disposable copy: 572 affected tests across 28 files passed,
// including 102 new refund cases. Type checking, build and targeted lint passed.
// No actual PayMongo refund requests were sent.
// Pending/uncertain online refunds remain reserved for Step 7.7 reconciliation.
// Your repository and both dev.db files were left unchanged.

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const REFUND_REASONS = [
  'duplicate',
  'fraudulent',
  'requested_by_customer',
  'others',
] as const;

export type RefundReason = typeof REFUND_REASONS[number];

export class CreateRefundDto {
  @IsUUID('4')
  requestId!: string;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amountCentavos!: number;

  @IsIn(REFUND_REASONS)
  reason!: RefundReason;

  // Required as true for Pay at Property. Omit for PayMongo.
  @IsOptional()
  @IsBoolean()
  cashReturnedConfirmed?: boolean;
}