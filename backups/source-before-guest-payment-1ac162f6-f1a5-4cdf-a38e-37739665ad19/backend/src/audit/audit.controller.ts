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
  AuditListQueryDto,
} from './dto/audit-list-query.dto.js';

import {
  AuditService,
} from './audit.service.js';

@Controller('audit-logs')
@Roles('ADMIN')
@Throttle({
  default: {
    limit: 30,
    ttl: 60_000,
  },
})
export class AuditController {
  constructor(
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async list(
    @Query() query: AuditListQueryDto,
  ) {
    return {
      data: await this.audit.list(query),
    };
  }
}