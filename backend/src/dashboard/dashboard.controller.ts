import {
  Controller,
  Get,
  Header,
} from '@nestjs/common';

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
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async summary() {
    return {
      data: await this.dashboard.summary(),
    };
  }

  @Get('financial-summary')
  @Roles('ADMIN', 'MANAGER')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async financialSummary() {
    return {
      data: await this.dashboard.financialSummary(),
    };
  }
}