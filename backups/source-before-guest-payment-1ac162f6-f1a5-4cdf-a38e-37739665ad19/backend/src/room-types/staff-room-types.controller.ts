import {
  Controller,
  Get,
  Header,
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
  RoomTypesService,
} from './room-types.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('staff/room-types')
@Roles('ADMIN', 'MANAGER')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class StaffRoomTypesController {
  constructor(
    private readonly roomTypes: RoomTypesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(@Req() request: StaffRequest) {
    return {
      data: await this.roomTypes.findAllForStaff(
        request.user,
      ),
    };
  }
}