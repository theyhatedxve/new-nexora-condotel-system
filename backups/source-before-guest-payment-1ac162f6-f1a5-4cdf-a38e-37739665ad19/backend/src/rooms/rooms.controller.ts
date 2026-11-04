
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  Roles,
  USER_ROLES,
} from '../common/decorators/roles.decorator.js';

import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
  ) {}

  @Roles(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.RECEPTIONIST,
  )
  @Get()
  async findAll() {
    return {
      data: await this.roomsService.findAll(),
    };
  }

  @Roles(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.RECEPTIONIST,
  )
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      data: await this.roomsService.findOne(id),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateRoomDto) {
    return {
      data: await this.roomsService.create(dto),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return {
      data: await this.roomsService.update(id, dto),
    };
  }
}
