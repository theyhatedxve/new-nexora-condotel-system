import { ReservationDepositsController } from './deposits/reservation-deposits.controller.js';
import { ReservationDepositsService } from './deposits/reservation-deposits.service.js';
import { ReservationChargesController } from './charges/reservation-charges.controller.js';
import { ReservationChargesService } from './charges/reservation-charges.service.js';
import { StayOperationsController } from './stay/stay-operations.controller.js';
import { StayOperationsService } from './stay/stay-operations.service.js';
import { ReservationContactsController } from './contacts/reservation-contacts.controller.js';
import { ReservationContactsService } from './contacts/reservation-contacts.service.js';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';

import {
  ReservationValidationService,
} from './inventory/reservation-validation.service.js';

import {
  ReservationAcquisitionService,
} from './inventory/reservation-acquisition.service.js';

import {
  ReservationsController,
} from './compatibility/reservations.controller.js';

import {
  BookingAccessController,
} from './compatibility/booking-access.controller.js';

import {
  InventorySafetyModule,
} from '../common/inventory/inventory-safety.module.js';

import {
  RoomAssignmentsController,
} from './assignments/room-assignments.controller.js';

import {
  RoomAssignmentsService,
} from './assignments/room-assignments.service.js';

import {
  ReservationLifecycleController,
} from './lifecycle/reservation-lifecycle.controller.js';

import {
  ReservationLifecycleService,
} from './lifecycle/reservation-lifecycle.service.js';

import {
  ReservationCancellationController,
} from './lifecycle/reservation-cancellation.controller.js';

import {
  ReservationCancellationService,
} from './lifecycle/reservation-cancellation.service.js';

import {
  ReservationStayController,
} from './stay/reservation-stay.controller.js';

import {
  ReservationStayService,
} from './stay/reservation-stay.service.js';

import {
  PaymentsModule,
} from '../payments/payments.module.js';

import {
  OwnershipModule,
} from '../common/ownership/ownership.module.js';

import {
  StaffReservationsController,
} from './staff/staff-reservations.controller.js';

import {
  StaffReservationsService,
} from './staff/staff-reservations.service.js';

import {
  GuestBookingService,
} from './guest-booking/guest-booking.service.js';

import {
  GuestBookingStaffService,
} from './staff/guest-booking-staff.service.js';

import {
  GuestBookingStaffController,
} from './staff/guest-booking-staff.controller.js';

import type {
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';

import {
  GuestBookingsController,
} from './guest-booking/guest-bookings.controller.js';

import {
  GuestBookingPrivacyMiddleware,
} from './guest-booking/guest-booking-privacy.middleware.js';

import {
  GuestReservationsController,
} from './guest-booking/guest-reservations.controller.js';

import {
  GuestReservationsService,
} from './guest-booking/guest-reservations.service.js';

@Module({
  imports: [
    PrismaModule,
    InventorySafetyModule,
    PaymentsModule,
    OwnershipModule,
  ],
  controllers: [
    ReservationDepositsController,
    ReservationChargesController,
    StayOperationsController,
    ReservationContactsController,
    ReservationsController,
    BookingAccessController,
    RoomAssignmentsController,
    ReservationLifecycleController,
    ReservationCancellationController,
    ReservationStayController,
    StaffReservationsController,
    GuestBookingsController,
    GuestBookingStaffController,
    GuestReservationsController,
  ],
  providers: [
    ReservationDepositsService,
    ReservationChargesService,
    StayOperationsService,
    ReservationContactsService,
    RoomRateCapacityService,
    ReservationValidationService,
    ReservationAcquisitionService,
    RoomAssignmentsService,
    ReservationLifecycleService,
    ReservationCancellationService,
    ReservationStayService,
    StaffReservationsService,
    GuestBookingService,
    GuestBookingStaffService,
    GuestReservationsService,
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
        GuestReservationsController,
      );
  }
}
