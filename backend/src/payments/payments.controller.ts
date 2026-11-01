import {
  Controller,
  Get,
  Header,
  Param,
  Req,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  PaymentSummaryService,
} from './payment-summary.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly summaries:
      PaymentSummaryService,
  ) {}

  @Get('reservations/:reservationId/summary')
  @Roles(
    'ADMIN',
    'MANAGER',
    'RECEPTIONIST',
    'GUEST',
  )
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async summary(
    @Param('reservationId')
    id: string,

    @Req()
    request: Request & {
      user?: AuthenticatedUser;
    },
  ) {
    return {
      data: await this.summaries.forUser(
        id,
        request.user,
      ),
    };
  }
}