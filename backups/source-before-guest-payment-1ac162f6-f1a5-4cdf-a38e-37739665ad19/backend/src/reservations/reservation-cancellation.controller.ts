import {
  Body,
  Controller,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  CancelReservationDto,
} from './dto/cancel-reservation.dto.js';

import {
  ReservationCancellationService,
} from './reservation-cancellation.service.js';

@Controller('reservations')
@Roles(
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
)
export class ReservationCancellationController {
  constructor(
    private readonly cancellation:
      ReservationCancellationService,
  ) {}

  @Post(':reservationId/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async cancel(
    @Param('reservationId')
    reservationId: string,

    @Body()
    input: CancelReservationDto,

    @Req()
    request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      data: await this.cancellation.cancel(
        reservationId,
        input.reason,
        request.user,
      ),
    };
  }
}