import { CancelReservationDto } from '../dto/cancel-reservation.dto.js';
import { ReservationCancellationService } from '../lifecycle/reservation-cancellation.service.js';
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Get,
  Header,
  Param,
  Query,
  Req,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Roles } from '../../common/decorators/roles.decorator.js';
import type {
  AuthenticatedUser,
} from '../../common/ownership/ownership.service.js';
import { RecordIdDto } from '../../common/validation/record-id.dto.js';
import { GuestReservationListDto } from '../dto/guest-reservation-list.dto.js';
import { GuestReservationsService } from './guest-reservations.service.js';

type GuestRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('guest/reservations')
@Roles('GUEST')
@Throttle({
  default: {
    limit: 30,
    ttl: 60_000,
  },
})
export class GuestReservationsController {
  constructor(
    private readonly reservations: GuestReservationsService,
    private readonly cancellations: ReservationCancellationService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(
    @Query() query: GuestReservationListDto,
    @Req() request: GuestRequest,
  ) {
    return {
      data: await this.reservations.listForGuest(request.user, query),
    };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async cancel(
    @Param() params: RecordIdDto,
    @Body() input: CancelReservationDto,
    @Req() request: GuestRequest,
  ) {
    return {
      data: await this.cancellations.cancelForGuest(params.id, input.reason, request.user),
    };
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async detail(
    @Param() params: RecordIdDto,
    @Req() request: GuestRequest,
  ) {
    return {
      data: await this.reservations.findOneForGuest(params.id, request.user),
    };
  }
}
