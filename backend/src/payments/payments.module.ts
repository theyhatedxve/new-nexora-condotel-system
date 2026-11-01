import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OwnershipModule } from '../common/ownership/ownership.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentSummaryService } from './payment-summary.service.js';
import { CheckoutService } from './checkout.service.js';
import { PaymongoAdapter } from './paymongo.adapter.js';
import { WebhooksController } from './webhooks.controller.js';
import { PaymongoWebhookService } from './paymongo-webhook.service.js';

@Module({
  imports: [PrismaModule, OwnershipModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentSummaryService, CheckoutService, PaymongoAdapter, PaymongoWebhookService],
  exports: [PaymentSummaryService, CheckoutService],
})
export class PaymentsModule {}
