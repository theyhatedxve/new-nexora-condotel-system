import {
  Body, Controller, ForbiddenException, Get, Header, Headers, HttpCode, Param, Post, Query, Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { RecordIdDto } from '../common/validation/record-id.dto.js';
import { ReservationDepositCommandDto, ReservationDepositQueryDto } from './dto/reservation-deposits.dto.js';
import { ReservationDepositsService } from './reservation-deposits.service.js';

@Controller('staff/reservations/:id/deposits')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
export class ReservationDepositsController {
  constructor(private readonly deposits: ReservationDepositsService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async read(@Param() params: RecordIdDto, @Query() query: ReservationDepositQueryDto,
    @Req() request: Request & { user?: AuthenticatedUser }) {
    return { data: await this.deposits.read(params.id, query.page, request.user) };
  }
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async mutate(@Param() params: RecordIdDto, @Body() input: ReservationDepositCommandDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser }) {
    if (!origin || !getAllowedOrigins().includes(origin)) throw new ForbiddenException('Request origin is not allowed.');
    return { data: await this.deposits.mutate(params.id, input, request.user) };
  }
}
