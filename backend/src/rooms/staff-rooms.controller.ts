import {
  Controller,
  Get,
  Header,
  Query,
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
  StaffRoomsQueryDto,
} from './dto/staff-rooms-query.dto.js';

import { RoomsService } from './rooms.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('staff/rooms')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class StaffRoomsController {
  constructor(
    private readonly rooms: RoomsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(
    @Query() query: StaffRoomsQueryDto,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.rooms.findStaffPage(
        query,
        request.user,
      ),
    };
  }
}