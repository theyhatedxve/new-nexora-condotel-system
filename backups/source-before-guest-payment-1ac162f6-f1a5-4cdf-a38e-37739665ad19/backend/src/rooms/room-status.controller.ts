
import {
  Body,
  Controller,
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
import { RoomStatusService } from './room-status.service.js';

type AuthenticatedRequest = Request & {
  user?: {
    role?: string;
  };
};

@Controller('rooms/:id/status')
export class RoomStatusController {
  constructor(
    private readonly roomStatusService: RoomStatusService,
  ) {}

  @Roles(
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

    if (!role) {
      throw new UnauthorizedException(
        'Authenticated user role is required.',
      );
    }

    return {
      data: await this.roomStatusService.update(
        roomId,
        dto.status,
        role,
      ),
    };
  }
}
