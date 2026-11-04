import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Patch,
  Req,
} from '@nestjs/common';

import {
  Throttle,
} from '@nestjs/throttler';

import type {
  Request,
} from 'express';

import {
  getAllowedOrigins,
} from '../auth/auth.config.js';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  UpdatePropertySettingsDto,
} from './dto/update-property-settings.dto.js';

import {
  SettingsService,
} from './settings.service.js';

@Controller('settings')
@Roles('ADMIN')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
  ) {}

  @Get('property')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({
    default: { limit: 30, ttl: 60_000 },
  })
  async read(
    @Req() request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      data: await this.settings.read(
        request.user,
      ),
    };
  }

  @Patch('property')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({
    default: { limit: 10, ttl: 60_000 },
  })
  async update(
    @Body() input: UpdatePropertySettingsDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    if (
      !origin ||
      !getAllowedOrigins().includes(origin)
    ) {
      throw new ForbiddenException(
        'Request origin is not allowed.',
      );
    }

    return {
      data: await this.settings.update(
        input,
        request.user,
      ),
    };
  }
}