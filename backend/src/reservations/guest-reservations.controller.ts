import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import { Roles } from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import { GuestReservationListDto } from './dto/guest-reservation-list.dto.js';

import { GuestReservationsService } from './guest-reservations.service.js';

type GuestRequest = Request & { user: AuthenticatedUser };

@Controller('guest/reservations')
@Roles('GUEST')
export class GuestReservationsController {
  constructor(private readonly reservations: GuestReservationsService) {}

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

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async detail(
    @Param('id') id: string,
    @Req() request: GuestRequest,
  ) {
    return {
      data: await this.reservations.findOneForGuest(id, request.user),
    };
  }
}
