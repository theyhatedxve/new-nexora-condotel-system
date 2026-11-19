import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OwnershipModule } from '../common/ownership/ownership.module.js';
import { PaymentsController } from './checkout/payments.controller.js';
import { PaymentSummaryService } from './summary/payment-summary.service.js';
import { CheckoutService } from './checkout/checkout.service.js';
import { PaymongoAdapter } from './paymongo/paymongo.adapter.js';
import { WebhooksController } from './paymongo/webhooks.controller.js';
import { PaymongoWebhookService } from './paymongo/paymongo-webhook.service.js';
import { PayAtPropertyController } from './collections/pay-at-property.controller.js';
import { PayAtPropertyService } from './collections/pay-at-property.service.js';
import { RefundsController } from './refunds/refunds.controller.js';
import { RefundsService } from './refunds/refunds.service.js';
import { PaymongoRefundAdapter } from './paymongo/paymongo-refund.adapter.js';
import { PaymentReconciliationController } from './reconciliation/payment-reconciliation.controller.js';
import { PaymentReconciliationService } from './reconciliation/payment-reconciliation.service.js';
import { PaymongoReconciliationAdapter } from './paymongo/paymongo-reconciliation.adapter.js';
import {
  PaymongoCheckoutExpirationAdapter,
} from './paymongo/paymongo-checkout-expiration.adapter.js';

import {
  GuestBookingDeadlineService,
} from './deadlines/guest-booking-deadline.service.js';

import {
  GuestBookingDeadlineWorker,
} from './deadlines/guest-booking-deadline.worker.js';

import { StaffPaymentsController } from './summary/staff-payments.controller.js';
import { StaffPaymentsService } from './summary/staff-payments.service.js';
@Module({
  imports: [PrismaModule, OwnershipModule],
  controllers: [
    PaymentsController,
    WebhooksController,
    PayAtPropertyController,
    RefundsController,
    PaymentReconciliationController,
    StaffPaymentsController,
  ],
  providers: [
    PaymentSummaryService,
    CheckoutService,
    PaymongoAdapter,
    PaymongoWebhookService,
    PayAtPropertyService,
    RefundsService,
    PaymongoRefundAdapter,
    PaymentReconciliationService,
    PaymongoReconciliationAdapter,
    StaffPaymentsService,
    GuestBookingDeadlineService,
    GuestBookingDeadlineWorker,
    PaymongoCheckoutExpirationAdapter,
  ],
  exports: [PaymentSummaryService, CheckoutService],
})
export class PaymentsModule {}