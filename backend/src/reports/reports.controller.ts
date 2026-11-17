import {
  Controller,
  Get,
  Header,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { DepositReportsService } from './deposit-reports.service.js';
import { DepositReportQueryDto } from './dto/deposit-report-query.dto.js';

import {
  Throttle,
} from '@nestjs/throttler';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import {
  CollectionsReportQueryDto,
} from './dto/collections-report-query.dto.js';

import {
  ReportsService,
} from './reports.service.js';

@Controller('reports')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
@Throttle({
  default: {
    limit: 30,
    ttl: 60_000,
  },
})
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly deposits: DepositReportsService,
  ) {}

  @Get('deposits')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async depositMovements(
    @Query() query: DepositReportQueryDto,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return { data: await this.deposits.read(query, request.user) };
  }

  @Get('collections')
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async collections(
    @Query() query: CollectionsReportQueryDto,
  ) {
    return {
      data: await this.reports.collections(query),
    };
  }
}
