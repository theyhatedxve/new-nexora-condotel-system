import { Controller, Get, Header, Param, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsISO8601, IsOptional, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/ownership/ownership.service.js';
import { RecordIdDto } from '../../common/validation/record-id.dto.js';
import { StayOperationsService } from './stay-operations.service.js';

export class StayOperationsQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  @MaxLength(40)
  requestedDepartureAt?: string;
}

@Controller('staff/reservations/:id/stay-operations')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
export class StayOperationsController {
  constructor(private readonly operations: StayOperationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async read(
    @Param() params: RecordIdDto,
    @Query() query: StayOperationsQueryDto,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return {
      data: await this.operations.read(params.id, query.requestedDepartureAt, request.user),
    };
  }
}
