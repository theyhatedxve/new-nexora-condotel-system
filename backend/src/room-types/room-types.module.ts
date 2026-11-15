
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RoomTypesController } from './room-types.controller.js';
import { RoomTypesService } from './room-types.service.js';
import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';

import { RentalPricingController } from './rental-pricing.controller.js';
import { RentalPricingService } from './rental-pricing.service.js';

import { StaffRoomTypesController } from './staff-room-types.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [RoomTypesController, StaffRoomTypesController, RentalPricingController],
  providers: [RoomTypesService, RoomRateCapacityService, RentalPricingService],
})
export class RoomTypesModule {}
