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

import {
  ReservationCancellationController,
} from './reservation-cancellation.controller.js';

import {
  ReservationCancellationService,
} from './reservation-cancellation.service.js';

import {
  ReservationStayController,
} from './reservation-stay.controller.js';

import {
  ReservationStayService,
} from './reservation-stay.service.js';

import {
  PaymentsModule,
} from '../payments/payments.module.js';

import {
  OwnershipModule,
} from '../common/ownership/ownership.module.js';

import {
  StaffReservationsController,
} from './staff-reservations.controller.js';

import {
  StaffReservationsService,
} from './staff-reservations.service.js';

import {
  GuestBookingService,
} from './guest-booking.service.js';

import {
  GuestBookingStaffService,
} from './guest-booking-staff.service.js';

import {
  GuestBookingStaffController,
} from './guest-booking-staff.controller.js';

import type {
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';

import {
  GuestBookingsController,
} from './guest-bookings.controller.js';

import {
  GuestBookingPrivacyMiddleware,
} from './guest-booking-privacy.middleware.js';

@Module({
  imports: [
    PrismaModule,
    InventorySafetyModule,
    PaymentsModule,
    OwnershipModule,
  ],
  controllers: [
    ReservationsController,
    BookingAccessController,
    RoomAssignmentsController,
    ReservationLifecycleController,
    ReservationCancellationController,
    ReservationStayController,
    StaffReservationsController,
    GuestBookingsController,
    GuestBookingStaffController,
  ],
  providers: [
    RoomRateCapacityService,
    ReservationValidationService,
    ReservationAcquisitionService,
    BookingAccessService,
    BookingAccessEmailService,
    RoomAssignmentsService,
    ReservationLifecycleService,
    ReservationCancellationService,
    ReservationStayService,
    StaffReservationsService,
    GuestBookingService,
    GuestBookingStaffService,
  ],
})
export class ReservationsModule
  implements NestModule
{
  configure(
    consumer: MiddlewareConsumer,
  ): void {
    consumer
      .apply(
        GuestBookingPrivacyMiddleware,
      )
      .forRoutes(
        GuestBookingsController,
      );
  }
}
