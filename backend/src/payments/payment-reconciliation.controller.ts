import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import {
  ReconcilePaymentDto,
  ReconcileRefundDto,
  ReconciliationListDto,
  ReconciliationRequestParamsDto,
  ReconciliationStatusQueryDto,
} from './dto/reconciliation.dto.js';
import { PaymentReconciliationService } from './payment-reconciliation.service.js';

@Controller('payments')
@Roles('ADMIN', 'MANAGER')
export class PaymentReconciliationController {
  constructor(private readonly reconciliation: PaymentReconciliationService) {}

  private origin(value: string | undefined) {
    if (!value || !getAllowedOrigins().includes(value))
      throw new ForbiddenException('Request origin is not allowed.');
  }

  @Get('reconciliation')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async list(
    @Query() query: ReconciliationListDto,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return { data: await this.reconciliation.list(query, request.user) };
  }

  @Get('reconciliation/requests/:requestId')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async requestStatus(
    @Param() params: ReconciliationRequestParamsDto,
    @Query() query: ReconciliationStatusQueryDto,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return {
      data: await this.reconciliation.requestStatus(
        params.requestId,
        query,
        request.user,
      ),
    };
  }

  @Post(':paymentId/reconcile')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async payment(
    @Param('paymentId') id: string,
    @Body() input: ReconcilePaymentDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    this.origin(origin);
    return { data: await this.reconciliation.payment(id, input, request.user) };
  }

  @Post('refunds/:refundId/reconcile')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refund(
    @Param('refundId') id: string,
    @Body() input: ReconcileRefundDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    this.origin(origin);
    return { data: await this.reconciliation.refund(id, input, request.user) };
  }
}