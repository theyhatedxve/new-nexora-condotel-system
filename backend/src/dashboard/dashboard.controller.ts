import {
  Controller,
  Get,
  Header,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';

import { Throttle } from '@nestjs/throttler';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import {
  DashboardService,
} from './dashboard.service.js';

@Controller('dashboard')
@Throttle({
  default: { limit: 30, ttl: 60_000 },
})
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
  ) {}

  @Get('summary')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async summary() {
    return {
      data: await this.dashboard.summary(),
    };
  }

  @Get('contact-queue')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async contactQueue(@Req() request: Request & { user?: AuthenticatedUser }) {
    return { data: await this.dashboard.contactQueue(request.user) };
  }

  @Get('attention-queues')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async attentionQueues(@Req() request: Request & { user?: AuthenticatedUser }) {
    return { data: await this.dashboard.attentionQueues(request.user) };
  }

  @Get('financial-summary')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async financialSummary() {
    return {
      data: await this.dashboard.financialSummary(),
    };
  }
}
