import {
  Body, Controller, Get, Header, Headers, Param, Put, Query, Req,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { getAllowedOrigins } from '../auth/auth.config.js';
import { RentalQuoteDto, SaveRentalPricingDto } from './dto/rental-pricing.dto.js';
import { RentalPricingService } from './rental-pricing.service.js';

@Controller('room-types/:id/pricing')
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
export class RentalPricingController {
  constructor(private readonly pricing: RentalPricingService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async read(
    @Param('id') id: string,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return { data: await this.pricing.read(id, request.user) };
  }

  @Put()
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async save(
    @Param('id') id: string,
    @Body() input: SaveRentalPricingDto,
    @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }
    return { data: await this.pricing.save(id, input, request.user) };
  }

  @Public()
  @Get('quote')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async quote(@Param('id') id: string, @Query() input: RentalQuoteDto) {
    return { data: await this.pricing.quote(id, input) };
  }
}
