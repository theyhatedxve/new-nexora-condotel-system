
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AmenitiesService } from './amenities.service.js';
import { AmenitiesController } from './amenities.controller.js';
import { RoomTypeAmenitiesController } from './room-type-amenities.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    AmenitiesController,
    RoomTypeAmenitiesController,
  ],
  providers: [AmenitiesService],
})
export class AmenitiesModule {}
