import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Roles } from '../common/decorators/roles.decorator.js';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { UsersService } from './users.service.js';

import {
  CreateStaffUserDto,
  StaffListQueryDto,
  StaffVersionDto,
  UpdateStaffUserDto,
} from './dto/staff-user.dto.js';

import type { Request } from 'express';
import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('staff/users')
@Roles('ADMIN')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private requireOrigin(origin: string | undefined): void {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException(
        'Request origin is not allowed.',
      );
    }
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(
    @Query() query: StaffListQueryDto,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.users.list(query, request.user),
    };
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async read(
    @Param('id') id: string,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.users.read(id, request.user),
    };
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({
    default: { limit: 5, ttl: 60_000 },
  })
  async create(
    @Body() input: CreateStaffUserDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
  ) {
    this.requireOrigin(origin);

    return {
      data: await this.users.create(input, request.user),
    };
  }

  @Patch(':id')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({
    default: { limit: 10, ttl: 60_000 },
  })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateStaffUserDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
  ) {
    this.requireOrigin(origin);

    return {
      data: await this.users.update(id, input, request.user),
    };
  }

  @Post(':id/invitation')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({
    default: { limit: 3, ttl: 60_000 },
  })
  async resendInvitation(
    @Param('id') id: string,
    @Body() input: StaffVersionDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
  ) {
    this.requireOrigin(origin);

    return {
      data: await this.users.resendInvitation(
        id,
        input,
        request.user,
      ),
    };
  }
}
