import { Body, Controller, ForbiddenException, Get, Header, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { CheckoutService } from './checkout.service.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PaymentSummaryService } from './payment-summary.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly summaries: PaymentSummaryService, private readonly checkout: CheckoutService) {}

  @Get('reservations/:reservationId/checkout')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async currentCheckout(@Param('reservationId') id: string, @Req() request: Request & { user?: AuthenticatedUser }) {
    return { data: await this.checkout.currentForUser(id, request.user) };
  }

  @Post('reservations/:reservationId/checkout')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async createCheckout(@Param('reservationId') id: string, @Body() input: CreateCheckoutDto,
    @Headers('origin') origin: string | undefined, @Req() request: Request & { user?: AuthenticatedUser }) {
    if (!origin || !getAllowedOrigins().includes(origin)) throw new ForbiddenException('Request origin is not allowed.');
    return { data: await this.checkout.startForUser(id, input.requestId, request.user) };
  }

  @Get('reservations/:reservationId/summary')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async summary(@Param('reservationId') id: string,
    @Req() request: Request & { user?: AuthenticatedUser }) {
    return { data: await this.summaries.forUser(id, request.user) };
  }
}
