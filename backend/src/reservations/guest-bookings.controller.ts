import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import {
  Throttle,
} from '@nestjs/throttler';

import type {
  Request,
  Response,
} from 'express';

import {
  getAllowedOrigins,
} from '../auth/auth.config.js';

import {
  Public,
} from '../common/decorators/public.decorator.js';

import {
  BOOKING_COOKIE,
  bookingCookieOptions,
} from './booking-access.config.js';

import {
  CreateGuestBookingDto,
} from './dto/create-guest-booking.dto.js';

import {
  RecoverGuestBookingDto,
} from './dto/recover-guest-booking.dto.js';

import {
  GuestBookingService,
} from './guest-booking.service.js';

import {
  CheckoutService,
} from '../payments/checkout.service.js';

import {
  CreateGuestBookingCheckoutDto,
  GuestBookingCheckoutScopeDto,
} from './dto/guest-booking-checkout.dto.js';

type BookingResult = Awaited<
  ReturnType<GuestBookingService['create']>
>;

@Public()
@Controller(
  'reservations/access/guest-bookings',
)
export class GuestBookingsController {
    constructor(
    private readonly bookings:
      GuestBookingService,
    private readonly checkout:
      CheckoutService,
  ) {}

  private checkRequest(
    origin: string | undefined,
    request: Request,
  ): void {
    if (
      !origin ||
      !getAllowedOrigins().includes(origin)
    ) {
      throw new ForbiddenException(
        'Request origin is not allowed.',
      );
    }

    if (
      Object.keys(request.query).length !== 0
    ) {
      throw new BadRequestException(
        'Send booking details in the request body.',
      );
    }
  }

  private respond(
    result: BookingResult,
    response: Response,
  ) {
    response.cookie(
      BOOKING_COOKIE,
      result.session.token,
      {
        ...bookingCookieOptions(),
        maxAge: Math.max(
          0,
          result.session.expiresAt.getTime() -
            Date.now(),
        ),
        expires: result.session.expiresAt,
      },
    );

    const receipt = result.receipt;

    return {
      data: {
        requestId: receipt.requestId,
        reservationNumber:
          receipt.reservationNumber,
        status: receipt.status,
        paymentPreference:
          receipt.paymentPreference,
        expectedArrivalAt:
          receipt.expectedArrivalAt,
        holdExpiresAt:
          receipt.holdExpiresAt,
        firstContactedAt:
          receipt.firstContactedAt,
        responseDeadlineAt:
          receipt.responseDeadlineAt,
        nightlyRateCentavos:
          receipt.nightlyRateCentavos,
        totalAmountCentavos:
          receipt.totalAmountCentavos,
        holdExpired:
          receipt.holdExpired,
        sessionExpiresAt:
          result.session.expiresAt,
        replayed: result.replayed,
      },
    };
  }

  @Post()
  @HttpCode(200)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  async create(
    @Body() input: CreateGuestBookingDto,
    @Headers('origin')
    origin: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    this.checkRequest(
      origin,
      request,
    );

    const result =
      await this.bookings.create(input);

    return this.respond(
      result,
      response,
    );
  }

  @Post('recover')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  async recover(
    @Body() input: RecoverGuestBookingDto,
    @Headers('origin')
    origin: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true })
    response: Response,
  ) {
    this.checkRequest(
      origin,
      request,
    );

    const result =
      await this.bookings.recover(
        input.requestId,
        input.recoveryToken,
      );

    return this.respond(
      result,
      response,
    );
  }

    @Post('checkout/current')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  async currentCheckout(
    @Body()
    input: GuestBookingCheckoutScopeDto,
    @Headers('origin')
    origin: string | undefined,
    @Req() request: Request,
  ) {
    this.checkRequest(
      origin,
      request,
    );

    return {
      data:
        await this.checkout.currentForSession(
          request.cookies?.[BOOKING_COOKIE],
          input.expectedReservationNumber,
        ),
    };
  }

  @Post('checkout')
  @HttpCode(200)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  async createCheckout(
    @Body()
    input: CreateGuestBookingCheckoutDto,
    @Headers('origin')
    origin: string | undefined,
    @Req() request: Request,
  ) {
    this.checkRequest(
      origin,
      request,
    );

    return {
      data:
        await this.checkout.startForSession(
          request.cookies?.[BOOKING_COOKIE],
          input.requestId,
          input.expectedReservationNumber,
        ),
    };
  }
}