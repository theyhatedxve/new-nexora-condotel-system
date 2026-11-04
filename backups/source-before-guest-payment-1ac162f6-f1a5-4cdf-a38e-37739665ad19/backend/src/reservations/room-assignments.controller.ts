import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  Roles,
} from '../common/decorators/roles.decorator.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import { AssignRoomDto } from './dto/assign-room.dto.js';

import {
  RoomAssignmentsService,
} from './room-assignments.service.js';

type StaffRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('reservations/:reservationId/assignments')
@Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
export class RoomAssignmentsController {
  constructor(
    private readonly assignments: RoomAssignmentsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async history(
    @Param('reservationId') reservationId: string,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.assignments.history(
        reservationId,
        request.user,
      ),
    };
  }

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async assign(
    @Param('reservationId') reservationId: string,
    @Body() input: AssignRoomDto,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.assignments.assign(
        reservationId,
        input.roomId,
        request.user,
      ),
    };
  }

  @Post(':assignmentId/reassign')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async reassign(
    @Param('reservationId') reservationId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() input: AssignRoomDto,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.assignments.reassign(
        reservationId,
        assignmentId,
        input.roomId,
        request.user,
      ),
    };
  }

  @Post(':assignmentId/release')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async release(
    @Param('reservationId') reservationId: string,
    @Param('assignmentId') assignmentId: string,
    @Req() request: StaffRequest,
  ) {
    return {
      data: await this.assignments.release(
        reservationId,
        assignmentId,
        request.user,
      ),
    };
  }
}