import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException, ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import type { Prisma, Reservation } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventorySafetyService } from '../common/inventory/inventory-safety.service.js';
import { blockWindow, calendarMarker, reservationWindow } from '../common/inventory/reservation-window.js';
import { STAFF_ROLES } from './guest-booking-staff-policy.js';
import { inventoryReservationWhere } from './inventory-reservation.js';
import { assertAllocatable, connectedStays, type Stay } from './room-allocation.js';
import { checkoutGuidance } from './stay-operations.policy.js';

@Injectable()
export class StayOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventorySafetyService,
  ) {}

  private async allocation(
    tx: Prisma.TransactionClient, booking: Reservation, roomId: string,
    requestedEnd: Date, now: Date,
  ) {
    const window = { start: now, end: requestedEnd };
    await this.inventory.assertEligibleInTx(tx, {
      roomId, roomTypeId: booking.roomTypeId, guestCount: booking.guestCount,
      checkInDate: booking.checkInDate.toISOString().slice(0, 10),
      checkOutDate: booking.checkOutDate.toISOString().slice(0, 10),
      mode: 'FUTURE', excludeReservationId: booking.id,
    }, window);

    const bookings = await tx.reservation.findMany({
      where: {
        OR: [
          { roomTypeId: booking.roomTypeId },
          { roomAssignments: { some: {
            releasedAt: null, room: { roomTypeId: booking.roomTypeId },
          } } },
        ],
        AND: [inventoryReservationWhere(now)],
      },
      include: { roomAssignments: { where: { releasedAt: null } } },
    });
    const type = await tx.roomType.findUniqueOrThrow({ where: { id: booking.roomTypeId } });
    const existing: Stay[] = [];
    for (const row of bookings) {
      if (row.id === booking.id) continue;
      const interval = reservationWindow(row);
      if (interval.end <= now) {
        if (row.status === 'CHECKED_IN') {
          throw new ConflictException('An overdue occupied stay requires staff review.');
        }
        continue;
      }
      if (row.roomTypeId !== booking.roomTypeId || row.guestCount > type.capacity) {
        throw new ConflictException('Category inventory requires review.');
      }
      existing.push({
        id: row.id,
        start: new Date(Math.max(interval.start.getTime(), now.getTime())),
        end: interval.end,
        roomIds: row.roomAssignments.map((assignment) => assignment.roomId),
      });
    }
    const rooms = await tx.room.findMany({
      where: {
        roomTypeId: booking.roomTypeId, isActive: true,
        status: { notIn: ['MAINTENANCE', 'OUT_OF_SERVICE'] },
      },
      include: { roomBlocks: { where: { canceledAt: null } } },
    });
    assertAllocatable(
      rooms.map((room) => ({ ...room, blocks: room.roomBlocks.map(blockWindow) })),
      connectedStays({
        id: booking.id, ...window, roomIds: [roomId],
      }, existing),
    );
  }

  async read(
    id: string, requestedDepartureAt: string | undefined,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) throw new UnauthorizedException('Staff sign-in required.');
    if (!STAFF_ROLES.includes(actor.role)) throw new ForbiddenException('Staff permission required.');
    if (typeof id !== 'string' || !id.trim() || id.length > 100) {
      throw new BadRequestException('Invalid reservation identifier.');
    }
    let requested: Date | null = null;
    if (requestedDepartureAt !== undefined) {
      if (typeof requestedDepartureAt !== 'string' || requestedDepartureAt.length > 40 ||
          !isISO8601(requestedDepartureAt, { strict: true }) ||
          !/(?:Z|[+-]\d{2}:\d{2})$/.test(requestedDepartureAt) ||
          !Number.isFinite(Date.parse(requestedDepartureAt))) {
        throw new BadRequestException('Provide a valid requested departure with a timezone.');
      }
      requested = new Date(requestedDepartureAt);
    }
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.user.findUnique({
        where: { id: actor.id },
        select: { status: true, role: { select: { name: true } } },
      });
      if (!staff || staff.status !== 'ACTIVE' || staff.role.name !== actor.role) {
        throw new ForbiddenException('Current staff permission required.');
      }
      const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
      if (properties.length !== 1) throw new InternalServerErrorException('Exactly one property must be configured.');
      const booking = await tx.reservation.findFirst({
        where: { id, roomType: { propertyId: properties[0].id } },
      });
      if (!booking) throw new NotFoundException('Reservation not found.');
      const now = new Date();
      const guidance = checkoutGuidance(booking, now);
      const assignments = await tx.roomAssignment.findMany({
        where: { reservationId: id, releasedAt: null }, take: 2,
        include: { room: { select: { status: true } } },
      });
      const assignment = assignments.length === 1 ? assignments[0] : null;
      let availability = 'NOT_REQUESTED';
      if (requested) {
        if (booking.status !== 'CHECKED_IN') availability = 'NOT_APPLICABLE';
        else if (!guidance.effectiveDepartureAt) availability = 'TIMING_REVIEW';
        else if (requested <= guidance.effectiveDepartureAt || requested <= now) {
          availability = 'INVALID_EXTENSION';
        } else if (booking.rentalType === 'HOURLY' &&
          requested > new Date(calendarMarker(booking.scheduledArrivalAt!).getTime() + 15 * 60 * 60_000)) {
          availability = 'HOURLY_CLOSING_LIMIT';
        } else if (!assignment || assignment.room.status !== 'OCCUPIED') {
          availability = 'INVENTORY_REVIEW_REQUIRED';
        } else {
          try {
            await this.allocation(tx, booking, assignment.roomId, requested, now);
            availability = 'AVAILABLE_FOR_REVIEW';
          } catch (error) {
            if (!(error instanceof ConflictException) &&
                !(error instanceof ServiceUnavailableException)) throw error;
            availability = 'INVENTORY_REVIEW_REQUIRED';
          }
        }
      }
      return {
        reservationId: id, status: booking.status, checkedAt: now,
        assignmentId: assignment?.id ?? null,
        roomStatus: assignment?.room.status ?? null,
        ...guidance, requestedDepartureAt: requested,
        availability, readOnly: true, approvalGranted: false,
      };
    });
  }
}
