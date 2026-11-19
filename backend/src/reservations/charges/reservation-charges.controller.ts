import {
  Body, Controller, ForbiddenException, Get, Header, Headers,
  HttpCode, Param, Post, Query, Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { getAllowedOrigins } from '../../auth/auth.config.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/ownership/ownership.service.js';
import { RecordIdDto } from '../../common/validation/record-id.dto.js';
import { ReservationChargeCommandDto, ReservationChargeQueryDto } from '../dto/reservation-charges.dto.js';
import { ReservationChargesService } from './reservation-charges.service.js';

@Controller('staff/reservations/:id/charges')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
export class ReservationChargesController {
  constructor(private readonly charges: ReservationChargesService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async list(@Param() params: RecordIdDto, @Query() query: ReservationChargeQueryDto,
    @Req() request: Request & { user?: AuthenticatedUser }) {
    return { data: await this.charges.list(params.id, query.page, request.user) };
  }
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async mutate(@Param() params: RecordIdDto, @Body() input: ReservationChargeCommandDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser }) {
    if (!origin || !getAllowedOrigins().includes(origin)) throw new ForbiddenException('Request origin is not allowed.');
    return { data: await this.charges.mutate(params.id, input, request.user) };
  }
}
