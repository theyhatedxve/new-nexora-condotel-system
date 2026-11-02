// REPLACE ENTIRE FILE: backend/src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OwnershipModule } from '../common/ownership/ownership.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentSummaryService } from './payment-summary.service.js';
import { CheckoutService } from './checkout.service.js';
import { PaymongoAdapter } from './paymongo.adapter.js';
import { WebhooksController } from './webhooks.controller.js';
import { PaymongoWebhookService } from './paymongo-webhook.service.js';
import { PayAtPropertyController } from './pay-at-property.controller.js';
import { PayAtPropertyService } from './pay-at-property.service.js';
import { RefundsController } from './refunds.controller.js';
import { RefundsService } from './refunds.service.js';
import { PaymongoRefundAdapter } from './paymongo-refund.adapter.js';

@Module({
  imports: [PrismaModule, OwnershipModule],
  controllers: [
    PaymentsController,
    WebhooksController,
    PayAtPropertyController,
    RefundsController,
  ],
  providers: [
    PaymentSummaryService,
    CheckoutService,
    PaymongoAdapter,
    PaymongoWebhookService,
    PayAtPropertyService,
    RefundsService,
    PaymongoRefundAdapter,
  ],
  exports: [PaymentSummaryService, CheckoutService],
})
export class PaymentsModule {}