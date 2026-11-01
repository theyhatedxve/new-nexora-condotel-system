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

import {
  InventorySafetyModule,
} from '../common/inventory/inventory-safety.module.js';

import {
  RoomAssignmentsController,
} from './room-assignments.controller.js';

import {
  RoomAssignmentsService,
} from './room-assignments.service.js';

import {
  ReservationLifecycleController,
} from './reservation-lifecycle.controller.js';

import {
  ReservationLifecycleService,
} from './reservation-lifecycle.service.js';

@Module({
  imports: [
    PrismaModule,
    InventorySafetyModule,
  ],
  controllers: [
    ReservationsController,
    BookingAccessController,
    RoomAssignmentsController,
    ReservationLifecycleController,
  ],
  providers: [
    RoomRateCapacityService,
    ReservationValidationService,
    ReservationAcquisitionService,
    BookingAccessService,
    BookingAccessEmailService,
    RoomAssignmentsService,
    ReservationLifecycleService,
  ],
})
export class ReservationsModule {}