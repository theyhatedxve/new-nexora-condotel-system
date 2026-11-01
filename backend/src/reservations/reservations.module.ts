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

import {
  BookingAccessController,
} from './booking-access.controller.js';

import {
  BookingAccessService,
} from './booking-access.service.js';

import {
  BookingAccessEmailService,
} from './booking-access-email.service.js';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    ReservationsController,
    BookingAccessController,
  ],
  providers: [
    RoomRateCapacityService,
    ReservationValidationService,
    ReservationAcquisitionService,
    BookingAccessService,
    BookingAccessEmailService,
  ],
})
export class ReservationsModule {}