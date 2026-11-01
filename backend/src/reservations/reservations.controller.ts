import {
  Body,
  Controller,
  ForbiddenException,
  Header,
  Headers,
  Post,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import { getAllowedOrigins } from '../auth/auth.config.js';
import { Public } from '../common/decorators/public.decorator.js';

import {
  CreateReservationDto,
} from './dto/create-reservation.dto.js';

import {
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly acquisition: ReservationAcquisitionService,
  ) {}

  @Public()
  @Post('pay-at-property')
  @Header('Cache-Control', 'no-store')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  async payAtProperty(
    @Body() input: CreateReservationDto,
    @Headers('origin') origin: string | undefined,
  ) {
    if (
      !origin ||
      !getAllowedOrigins().includes(origin)
    ) {
      throw new ForbiddenException(
        'Request origin is not allowed.',
      );
    }

    // The backend selects the reservation policy.
    const result = await this.acquisition.acquire(
      input,
      'CONFIRMED',
    );

    return {
      data: {
        reservationNumber: result.reservationNumber,
        status: result.status,
        nightlyRateCentavos: result.nightlyRateCentavos,
        totalAmountCentavos: result.totalAmountCentavos,
      },
    };
  }
}