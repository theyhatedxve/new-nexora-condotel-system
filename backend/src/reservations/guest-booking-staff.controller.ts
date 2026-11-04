import {
  Body,
  Controller,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  ConfirmGuestBookingDto,
} from './dto/confirm-guest-booking.dto.js';

import {
  RecordGuestContactDto,
} from './dto/record-guest-contact.dto.js';

import {
  RejectGuestBookingDto,
} from './dto/reject-guest-booking.dto.js';

import {
  GuestBookingStaffService,
} from './guest-booking-staff.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('reservations/:reservationId/guest-request')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
export class GuestBookingStaffController {
  constructor(
    private readonly staffBookings: GuestBookingStaffService,
  ) {}

  @Post('contact')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async contact(
    @Param('reservationId')
    reservationId: string,

    @Body()
    input: RecordGuestContactDto,

    @Req()
    request: StaffRequest,
  ) {
    return {
      data: await this.staffBookings.contact(
        request.user,
        reservationId,
        input.channel,
      ),
    };
  }

  @Post('confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async confirm(
    @Param('reservationId')
    reservationId: string,

    @Body()
    input: ConfirmGuestBookingDto,

    @Req()
    request: StaffRequest,
  ) {
    return {
      data: await this.staffBookings.confirm(
        request.user,
        reservationId,
        input.guestAgreed,
      ),
    };
  }

  @Post('reject')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async reject(
    @Param('reservationId')
    reservationId: string,

    @Body()
    input: RejectGuestBookingDto,

    @Req()
    request: StaffRequest,
  ) {
    return {
      data: await this.staffBookings.reject(
        request.user,
        reservationId,
        input.reason,
      ),
    };
  }
}
