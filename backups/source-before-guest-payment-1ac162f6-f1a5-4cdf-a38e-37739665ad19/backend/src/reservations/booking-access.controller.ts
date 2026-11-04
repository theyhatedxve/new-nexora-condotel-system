import { Body, Controller, ForbiddenException, Get, Header, Headers, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { PaymentSummaryService } from '../payments/payment-summary.service.js';
import { CheckoutService } from '../payments/checkout.service.js';
import { CreateCheckoutDto } from '../payments/dto/create-checkout.dto.js';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { BookingAccessService } from './booking-access.service.js';
import { ACCESS_ACKNOWLEDGMENT, BOOKING_COOKIE, BOOKING_SESSION_MS, bookingCookieOptions } from './booking-access.config.js';
import { RequestBookingAccessDto, ExchangeBookingAccessDto } from './dto/booking-access.dto.js';

@Public()
@Controller('reservations/access')
export class BookingAccessController {
  constructor(
    private readonly access: BookingAccessService,
    private readonly summaries: PaymentSummaryService,
    private readonly checkout: CheckoutService,
  ) {}

  @Get('checkout')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Cookie, Origin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async currentCheckout(@Req() request: Request) {
    return { data: await this.checkout.currentForSession(request.cookies?.[BOOKING_COOKIE]) };
  }

  @Post('checkout')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async createCheckout(@Body() input: CreateCheckoutDto, @Headers('origin') origin: string | undefined,
    @Req() request: Request) {
    this.checkOrigin(origin);
    return { data: await this.checkout.startForSession(request.cookies?.[BOOKING_COOKIE], input.requestId) };
  }

  @Get('payment-summary')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Cookie, Origin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async paymentSummary(@Req() request: Request) {
    const booking = await this.access.current(request.cookies?.[BOOKING_COOKIE]);
    return { data: await this.summaries.forVerifiedBookingNumber(booking.reservationNumber) };
  }

  private checkOrigin(origin: string | undefined): void {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }
  }

  @Post('request')
  @Header('Cache-Control', 'no-store')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  request(@Body() input: RequestBookingAccessDto, @Headers('origin') origin: string | undefined) {
    this.checkOrigin(origin);
    this.access.request(input);
    return { data: { message: ACCESS_ACKNOWLEDGMENT } };
  }

  @Post('exchange')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async exchange(
    @Body() input: ExchangeBookingAccessDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(origin);
    const result = await this.access.exchange(input.token, request.cookies?.[BOOKING_COOKIE]);
    response.cookie(BOOKING_COOKIE, result.sessionToken, {
      ...bookingCookieOptions(), maxAge: BOOKING_SESSION_MS, expires: result.expiresAt,
    });
    return { data: { expiresAt: result.expiresAt } };
  }

  @Get('current')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Cookie, Origin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async current(@Req() request: Request) {
    return { data: await this.access.current(request.cookies?.[BOOKING_COOKIE]) };
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logout(
    @Headers('origin') origin: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(origin);
    await this.access.logout(request.cookies?.[BOOKING_COOKIE]);
    response.clearCookie(BOOKING_COOKIE, bookingCookieOptions());
  }
}
