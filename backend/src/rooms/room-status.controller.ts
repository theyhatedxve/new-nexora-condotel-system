
import {
  Body,
  Controller,
  Get,
  Header,
  Query,
  Patch,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  Roles,
  USER_ROLES,
} from '../common/decorators/roles.decorator.js';

import { UpdateRoomStatusDto } from './dto/update-room-status.dto.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { RoomStatusHistoryQueryDto } from './dto/update-room-status.dto.js';
import { RoomStatusService } from './room-status.service.js';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('rooms/:id/status')
export class RoomStatusController {
  constructor(
    private readonly roomStatusService: RoomStatusService,
  ) {}

  @Roles(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.RECEPTIONIST,
  )
  @Patch()
  async update(
    @Param('id') roomId: string,
    @Body() dto: UpdateRoomStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const role = request.user?.role;

    if (!role || !request.user?.id) {
      throw new UnauthorizedException(
        'Authenticated staff identity is required.',
      );
    }

    return {
      data: await this.roomStatusService.update(
        roomId,
        dto.status,
        role,
        request.user,
        dto.expectedStatus,
      ),
    };
  }
  @Get('history')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.RECEPTIONIST)
  @Header('Cache-Control', 'no-store')
  @Header('Vary', 'Authorization, Origin')
  async history(
    @Param('id') roomId: string,
    @Query() query: RoomStatusHistoryQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return { data: await this.roomStatusService.history(roomId, query.page, request.user) };
  }

}
