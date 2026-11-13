import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CheckoutService } from '../payments/checkout.service.js';
import { PaymentSummaryService } from '../payments/payment-summary.service.js';
import { GuestBookingService } from './guest-booking.service.js';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto.js';
import { RecoverGuestBookingDto } from './dto/recover-guest-booking.dto.js';
import {
  CreateGuestBookingCheckoutDto,
  GuestBookingCheckoutScopeDto,
} from './dto/guest-booking-checkout.dto.js';

type GuestRequest = Request & { user: AuthenticatedUser };

@Controller('guest/reservations')
@Roles('GUEST')
export class GuestBookingsController {
  constructor(
    private readonly bookings: GuestBookingService,
    private readonly checkout: CheckoutService,
    private readonly summaries: PaymentSummaryService,
    private readonly prisma: PrismaService,
  ) {}

  private checkOrigin(origin: string | undefined): void {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }
  }

  private async owned(reference: string, identity: AuthenticatedUser) {
    const booking = await this.prisma.reservation.findFirst({
      where: { reservationNumber: reference, guest: { userId: identity.id } },
      select: {
        id: true,
        reservationNumber: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        guestCount: true,
        nightlyRateCentavos: true,
        totalAmountCentavos: true,
        holdExpiresAt: true,
        bookingPolicyVersion: true,
        paymentPreference: true,
        expectedArrivalAt: true,
        firstContactedAt: true,
        responseDeadlineAt: true,
        confirmedAt: true,
        roomType: { select: { name: true } },
        guest: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return {
      ...booking,
      holdExpired: booking.status === 'PENDING' &&
        booking.holdExpiresAt !== null && booking.holdExpiresAt.getTime() <= Date.now(),
    };
  }

  @Get('profile')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async profile(@Req() request: GuestRequest) {
    return { data: await this.bookings.profile(request.user) };
  }

  @Get('by-reference/:reference')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async read(@Param('reference') reference: string, @Req() request: GuestRequest) {
    return { data: await this.owned(reference, request.user) };
  }

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(
    @Body() input: CreateGuestBookingDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: GuestRequest,
  ) {
    this.checkOrigin(origin);
    return { data: await this.bookings.create(input, request.user) };
  }

  @Post('recover')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async recover(
    @Body() input: RecoverGuestBookingDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: GuestRequest,
  ) {
    this.checkOrigin(origin);
    return {
      data: await this.bookings.recover(input.requestId, input.recoveryToken, request.user),
    };
  }

  @Post('checkout/current')
  @HttpCode(200)
  async currentCheckout(
    @Body() input: GuestBookingCheckoutScopeDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: GuestRequest,
  ) {
    this.checkOrigin(origin);
    const booking = await this.owned(input.expectedReservationNumber, request.user);
    return { data: await this.checkout.currentForUser(booking.id, request.user) };
  }

  @Post('checkout')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async createCheckout(
    @Body() input: CreateGuestBookingCheckoutDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: GuestRequest,
  ) {
    this.checkOrigin(origin);
    const booking = await this.owned(input.expectedReservationNumber, request.user);
    return { data: await this.checkout.startForUser(booking.id, input.requestId, request.user) };
  }

  @Post('payment-summary')
  @HttpCode(200)
  async summary(
    @Body() input: GuestBookingCheckoutScopeDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: GuestRequest,
  ) {
    this.checkOrigin(origin);
    const booking = await this.owned(input.expectedReservationNumber, request.user);
    return { data: await this.summaries.forUser(booking.id, request.user) };
  }
}
