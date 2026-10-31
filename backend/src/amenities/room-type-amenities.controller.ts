
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator.js';
import {
  Roles,
  USER_ROLES,
} from '../common/decorators/roles.decorator.js';

import { AmenitiesService } from './amenities.service.js';
import { AttachAmenityDto } from './dto/attach-amenity.dto.js';

@Controller('room-types/:id/amenities')
export class RoomTypeAmenitiesController {
  constructor(
    private readonly amenitiesService: AmenitiesService,
  ) {}

  @Public()
  @Get()
  async findAll(@Param('id') roomTypeId: string) {
    return {
      data: await this.amenitiesService.findRoomTypeAmenities(
        roomTypeId,
      ),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post()
  @HttpCode(201)
  async attach(
    @Param('id') roomTypeId: string,
    @Body() dto: AttachAmenityDto,
  ) {
    return {
      data: await this.amenitiesService.attach(
        roomTypeId,
        dto.amenityId,
      ),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Delete(':amenityId')
  @HttpCode(204)
  async detach(
    @Param('id') roomTypeId: string,
    @Param('amenityId') amenityId: string,
  ): Promise<void> {
    await this.amenitiesService.detach(
      roomTypeId,
      amenityId,
    );
  }
}
