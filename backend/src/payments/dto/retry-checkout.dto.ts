import { Matches } from 'class-validator';
import { CreateCheckoutDto } from './create-checkout.dto.js';

export class RetryCheckoutDto extends CreateCheckoutDto {
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  previousPaymentId!: string;
}
