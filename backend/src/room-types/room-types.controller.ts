
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

import { RoomTypesService } from './room-types.service.js';

import { CreateRoomTypeDto } from './dto/create-room-type.dto.js';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto.js';

@Controller('room-types')
export class RoomTypesController {
  constructor(
    private readonly roomTypesService: RoomTypesService,
  ) {}

  @Public()
  @Get()
  async findAll() {
    const data = await this.roomTypesService.findAll();
    return { data };
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.roomTypesService.findOne(id);
    return { data };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateRoomTypeDto) {
    const data = await this.roomTypesService.create(dto);
    return { data };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
  ) {
    const data = await this.roomTypesService.update(id, dto);
    return { data };
  }
}
