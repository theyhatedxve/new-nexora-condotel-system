import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  OwnershipModule,
} from '../common/ownership/ownership.module.js';

import {
  PaymentsController,
} from './payments.controller.js';

import {
  PaymentSummaryService,
} from './payment-summary.service.js';

@Module({
  imports: [
    PrismaModule,
    OwnershipModule,
  ],
  controllers: [
    PaymentsController,
  ],
  providers: [
    PaymentSummaryService,
  ],
  exports: [
    PaymentSummaryService,
  ],
})
export class PaymentsModule {}