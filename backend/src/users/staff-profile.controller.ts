import {
  Body, Controller, Get, Header, Headers, HttpCode, Patch, Post, Req, Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  requireAuthRealmOrigin, getAuthRealmCookie,
} from '../auth/auth-realm.config.js';
import {
  ChangeMyEmailDto, ChangeMyPasswordDto, UpdateMyProfileDto,
} from './dto/staff-profile.dto.js';
import { StaffProfileService } from './staff-profile.service.js';

type StaffRequest = Request & { user?: AuthenticatedUser };

@Controller('staff/profile')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class StaffProfileController {
  constructor(private readonly profiles: StaffProfileService) {}

  private clearStaffCookie(response: Response): void {
    const cookie = getAuthRealmCookie('staff');
    response.clearCookie(cookie.name, cookie.options);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async read(@Req() request: StaffRequest) {
    return { data: await this.profiles.read(request.user) };
  }

  @Patch()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async update(
    @Body() input: UpdateMyProfileDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
  ) {
    requireAuthRealmOrigin('staff', origin);
    return { data: await this.profiles.update(input, request.user) };
  }

  @Post('email')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changeEmail(
    @Body() input: ChangeMyEmailDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    requireAuthRealmOrigin('staff', origin);
    const data = await this.profiles.changeEmail(input, request.user);
    this.clearStaffCookie(response);
    return { data };
  }

  @Post('password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @Body() input: ChangeMyPasswordDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    requireAuthRealmOrigin('staff', origin);
    const data = await this.profiles.changePassword(input, request.user);
    this.clearStaffCookie(response);
    return { data };
  }
}
