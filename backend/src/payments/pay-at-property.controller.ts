// CREATE: backend/src/payments/pay-at-property.controller.ts

import {
  Body,
  Controller,
  ForbiddenException,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { RecordPropertyPaymentDto } from './dto/record-property-payment.dto.js';
import { PayAtPropertyService } from './pay-at-property.service.js';

@Controller('payments')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
export class PayAtPropertyController {
  constructor(private readonly collections: PayAtPropertyService) {}

  @Post('reservations/:reservationId/pay-at-property')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async record(
    @Param('reservationId') id: string,
    @Body() input: RecordPropertyPaymentDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }

    return {
      data: await this.collections.record(id, input, request.user),
    };
  }
}