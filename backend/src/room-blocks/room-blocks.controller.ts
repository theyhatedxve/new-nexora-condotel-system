
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

import { CreateRoomBlockDto } from './dto/create-room-block.dto.js';
import { UpdateRoomBlockDto } from './dto/update-room-block.dto.js';
import { RoomBlocksService } from './room-blocks.service.js';

@Controller('rooms/:id/blocks')
export class RoomBlocksController {
  constructor(
    private readonly blocks: RoomBlocksService,
  ) {}

  @Roles(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.RECEPTIONIST,
  )
  @Get()
  async list(@Param('id') roomId: string) {
    return {
      data: await this.blocks.list(roomId),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post()
  @HttpCode(201)
  async create(
    @Param('id') roomId: string,
    @Body() dto: CreateRoomBlockDto,
  ) {
    return {
      data: await this.blocks.create(roomId, dto),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Patch(':blockId')
  async update(
    @Param('id') roomId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateRoomBlockDto,
  ) {
    return {
      data: await this.blocks.update(
        roomId,
        blockId,
        dto,
      ),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post(':blockId/cancel')
  async cancel(
    @Param('id') roomId: string,
    @Param('blockId') blockId: string,
  ) {
    return {
      data: await this.blocks.cancel(
        roomId,
        blockId,
      ),
    };
  }
}
