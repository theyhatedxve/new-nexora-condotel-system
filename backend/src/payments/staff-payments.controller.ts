import {
  Controller,
  Get,
  Header,
  Param,
  Req,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  RecordIdDto,
} from '../common/validation/record-id.dto.js';

import {
  StaffPaymentsService,
} from './staff-payments.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('staff/payments')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class StaffPaymentsController {
  constructor(
    private readonly payments: StaffPaymentsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(@Req() request: StaffRequest) {
    return {
      data: await this.payments.list(request.user),
    };
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async detail(
    @Param() params: RecordIdDto,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.payments.detail(
        params.id,
        request.user,
      ),
    };
  }
}