import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  ReportsController,
} from './reports.controller.js';

import {
  ReportsService,
} from './reports.service.js';
import { DepositReportsService } from './deposit-reports.service.js';
import { FinancialExceptionReportsService } from './financial-exception-reports.service.js';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    ReportsController,
  ],
  providers: [
    ReportsService,
    DepositReportsService,
    FinancialExceptionReportsService,
  ],
})
export class ReportsModule {}
