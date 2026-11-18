import {
  Controller,
  Get,
  Header,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Roles } from '../common/decorators/roles.decorator.js';
import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import { GuestAccountsService } from './guest-accounts.service.js';
import { GuestAccountsQueryDto } from './dto/guest-accounts-query.dto.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('staff/guest-accounts')
@Roles('SUPER_ADMIN', 'ADMIN')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class GuestAccountsController {
  constructor(
    private readonly accounts: GuestAccountsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(
    @Query() query: GuestAccountsQueryDto,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.accounts.list(query, request.user),
    };
  }
}