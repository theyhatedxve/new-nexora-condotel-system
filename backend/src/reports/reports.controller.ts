import {
  Controller,
  Get,
  Header,
  Query,
} from '@nestjs/common';

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
@Roles('ADMIN', 'MANAGER')
@Throttle({
  default: {
    limit: 30,
    ttl: 60_000,
  },
})
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
  ) {}

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