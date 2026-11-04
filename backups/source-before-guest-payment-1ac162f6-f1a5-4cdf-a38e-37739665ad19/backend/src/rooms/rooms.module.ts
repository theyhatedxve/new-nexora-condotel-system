
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

import { RoomStatusController } from './room-status.controller.js';
import { RoomStatusService } from './room-status.service.js';

import {
  StaffRoomsController,
} from './staff-rooms.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [RoomsController, RoomStatusController, StaffRoomsController],
  providers: [RoomsService, RoomStatusService],
})
export class RoomsModule {}
