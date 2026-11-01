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
  CheckInDto,
  StayAssignmentDto,
} from './dto/reservation-stay.dto.js';

import {
  ReservationStayService,
} from './reservation-stay.service.js';

@Controller('reservations')
@Roles(
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
)
export class ReservationStayController {
  constructor(
    private readonly stays:
      ReservationStayService,
  ) {}

  @Post(':reservationId/check-in')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async checkIn(
    @Param('reservationId')
    id: string,

    @Body()
    input: CheckInDto,

    @Req()
    request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      data: await this.stays.checkIn(
        id,
        input.assignmentId,
        input.identityVerified,
        request.user,
      ),
    };
  }

  @Post(':reservationId/check-out')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async checkOut(
    @Param('reservationId')
    id: string,

    @Body()
    input: StayAssignmentDto,

    @Req()
    request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      data: await this.stays.checkOut(
        id,
        input.assignmentId,
        request.user,
      ),
    };
  }
}