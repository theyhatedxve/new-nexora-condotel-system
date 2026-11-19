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
import { ReservationContactDto, ReservationContactQueryDto } from '../dto/reservation-contact.dto.js';
import { ReservationContactsService } from './reservation-contacts.service.js';

type StaffRequest = Request & { user?: AuthenticatedUser };

@Controller('staff/reservations/:id/contacts')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST')
export class ReservationContactsController {
  constructor(private readonly contacts: ReservationContactsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async list(
    @Param() params: RecordIdDto,
    @Query() query: ReservationContactQueryDto,
    @Req() request: StaffRequest,
  ) {
    return { data: await this.contacts.list(params.id, query.page, request.user) };
  }

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async record(
    @Param() params: RecordIdDto,
    @Body() input: ReservationContactDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: StaffRequest,
  ) {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }
    return { data: await this.contacts.record(params.id, input, request.user) };
  }
}
