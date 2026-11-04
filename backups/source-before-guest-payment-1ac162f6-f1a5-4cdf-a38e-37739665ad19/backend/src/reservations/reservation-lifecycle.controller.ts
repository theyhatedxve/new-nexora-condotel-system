import {
  Body,
  Controller,
  Header,
  HttpCode,
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
  ExpireHoldsDto,
} from './dto/expire-holds.dto.js';

import {
  ReservationLifecycleService,
} from './reservation-lifecycle.service.js';

@Controller('reservations/lifecycle')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
export class ReservationLifecycleController {
  constructor(
    private readonly lifecycle: ReservationLifecycleService,
  ) {}

  @Post('expire-holds')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async expireHolds(
    @Body() input: ExpireHoldsDto,
    @Req() request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      data: await this.lifecycle.expireHolds(
        request.user,
        input?.limit,
      ),
    };
  }
}