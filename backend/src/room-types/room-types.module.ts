
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RoomTypesController } from './room-types.controller.js';
import { RoomTypesService } from './room-types.service.js';
import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RoomTypesController],
  providers: [RoomTypesService, RoomRateCapacityService],
})
export class RoomTypesModule {}
