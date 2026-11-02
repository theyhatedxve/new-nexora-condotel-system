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
  StaffGuestsService,
} from './staff-guests.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('staff/guests')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class StaffGuestsController {
  constructor(
    private readonly records: StaffGuestsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(@Req() request: StaffRequest) {
    return {
      data: await this.records.list(request.user),
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
      data: await this.records.detail(
        params.id,
        request.user,
      ),
    };
  }
}