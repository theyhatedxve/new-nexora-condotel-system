import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators/public.decorator.js';

import { AvailabilityService } from './availability.service.js';
import { SearchAvailabilityDto } from './dto/search-availability.dto.js';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async search(@Query() query: SearchAvailabilityDto) {
    const data = await this.availabilityService.search(query);
    return { data };
  }
}