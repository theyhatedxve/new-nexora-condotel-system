// CREATE: backend/src/payments/refunds.controller.ts

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
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { CreateRefundDto } from './dto/create-refund.dto.js';
import { RefundsService } from './refunds.service.js';

@Controller('payments')
@Roles('ADMIN', 'MANAGER')
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post(':paymentId/refunds')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(
    @Param('paymentId') id: string,
    @Body() input: CreateRefundDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }

    return {
      data: await this.refunds.create(id, input, request.user),
    };
  }

  @Get('refunds/:refundId')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async read(
    @Param('refundId') id: string,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return {
      data: await this.refunds.forUser(id, request.user),
    };
  }
}