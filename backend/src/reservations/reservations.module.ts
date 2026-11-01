import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';

import {
  ReservationValidationService,
} from './reservation-validation.service.js';

import {
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

import {
  ReservationsController,
} from './reservations.controller.js';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    ReservationsController,
  ],
  providers: [
    RoomRateCapacityService,
    ReservationValidationService,
    ReservationAcquisitionService,
  ],
})
export class ReservationsModule {}