
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module.js';

import { RoomRateCapacityService } from '../validation/room-rate-capacity.service.js';

import { InventorySafetyService } from './inventory-safety.service.js';

@Module({
  imports: [PrismaModule],
  providers: [
    RoomRateCapacityService,
    InventorySafetyService,
  ],
  exports: [InventorySafetyService],
})
export class InventorySafetyModule {}
