
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator.js';
import {
  Roles,
  USER_ROLES,
} from '../common/decorators/roles.decorator.js';

import { AmenitiesService } from './amenities.service.js';
import { CreateAmenityDto } from './dto/create-amenity.dto.js';
import { UpdateAmenityDto } from './dto/update-amenity.dto.js';

@Controller('amenities')
export class AmenitiesController {
  constructor(
    private readonly amenitiesService: AmenitiesService,
  ) {}

  @Public()
  @Get()
  async findAll() {
    return {
      data: await this.amenitiesService.findAll(),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateAmenityDto) {
    return {
      data: await this.amenitiesService.create(dto),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAmenityDto,
  ) {
    return {
      data: await this.amenitiesService.update(id, dto),
    };
  }
}
