import { cancelUnpaidNoShowsInTx } from './reservation-no-show.js';
import { RENTAL_RESERVATION_SELECT, actualRentalWindow } from './rental-reservation.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  InventorySafetyService,
} from '../common/inventory/inventory-safety.service.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  assertInventoryCommitments,
  withInventoryWrite,
} from './inventory-write.js';

import {
  assertReservationTransition,
} from './reservation-lifecycle.js';

import {
  requireFullRecordedPayment,
} from './stay-payment-policy.js';

@Injectable()
export class ReservationStayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory:
      InventorySafetyService,
  ) {}

  checkIn(
    reservationId: string,
    assignmentId: string,
    identityVerified: boolean,
    actor: AuthenticatedUser | undefined,
  ) {
    if (identityVerified !== true) {
      throw new BadRequestException(
        'Complete the guest identity check first.',
      );
    }

    return this.transition(
      reservationId,
      assignmentId,
      'CHECKED_IN',
      actor,
    );
  }

  checkOut(
    reservationId: string,
    assignmentId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.transition(
      reservationId,
      assignmentId,
      'CHECKED_OUT',
      actor,
    );
  }

  private async requirePriorEvent(
    tx: Prisma.TransactionClient,
    reservationId: string,
    assignmentId: string,
    action: string,
  ) {
    const event = await tx.auditLog.findFirst({
      where: {
        entityType: 'Reservation',
        entityId: reservationId,
        action,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select: {
        detailsJson: true,
      },
    });

    let details: unknown;

    try {
      details = JSON.parse(
        event?.detailsJson ?? 'null',
      );
    } catch {
      details = null;
    }

    if (
      !details ||
      typeof details !== 'object' ||
      !('assignmentId' in details) ||
      details.assignmentId !== assignmentId
    ) {
      throw new ConflictException(
        'The recorded stay operation does not match this assignment. Staff review is required.',
      );
    }
  }

  private async transition(
    reservationId: string,
    assignmentId: string,
    target: 'CHECKED_IN' | 'CHECKED_OUT',
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (
      ![
        'SUPER_ADMIN',
        'ADMIN',
        'MANAGER',
        'RECEPTIONIST',
      ].includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }

    if (
      typeof assignmentId !== 'string' ||
      !assignmentId.trim() ||
      assignmentId.length > 100
    ) {
      throw new BadRequestException(
        'A valid assignment ID is required.',
      );
    }

    const outcome = await withInventoryWrite(
      this.prisma,
      async (tx) => {
        const properties =
          await tx.property.findMany({
            select: {
              id: true,
            },
            take: 2,
          });

        if (properties.length !== 1) {
          throw new InternalServerErrorException(
            'Exactly one property must be configured.',
          );
        }

        const booking =
          await tx.reservation.findFirst({
            where: {
              id: reservationId,
              roomType: {
                propertyId: properties[0].id,
              },
            },
            select: {
              id: true,
              reservationNumber: true,
              roomTypeId: true,
              status: true,
              ...RENTAL_RESERVATION_SELECT,
              checkInDate: true,
              checkOutDate: true,
              guestCount: true,
              totalAmountCentavos: true,
            },
          });

        if (!booking) {
          throw new NotFoundException(
            'Reservation not found.',
          );
        }

        const action =
          target === 'CHECKED_IN'
            ? 'reservation.checked_in'
            : 'reservation.checked_out';

        const result = (
          alreadyProcessed: boolean,
        ) => ({
          reservationNumber:
            booking.reservationNumber,
          status: target,
          alreadyProcessed,
        });

        if (booking.status === target) {
          await this.requirePriorEvent(
            tx,
            booking.id,
            assignmentId,
            action,
          );

          // A retry acknowledges the original operation.
          // It must not change the room again.
          return result(true);
        }

        assertReservationTransition(
          booking.status,
          target,
        );

        const now = new Date();
        const today = todayInPhilippines();

        if (
          target === 'CHECKED_IN' && !booking.rentalType &&
          (
            booking.checkInDate > today ||
            booking.checkOutDate <= today
          )
        ) {
          throw new ConflictException(
            'Check-in must be within the booked Philippine calendar dates.',
          );
        }

        const active =
          await tx.roomAssignment.findMany({
            where: {
              reservationId,
              releasedAt: null,
            },
            select: {
              id: true,
              roomId: true,
              room: {
                select: {
                  status: true,
                },
              },
            },
            take: 2,
          });

        if (
          active.length !== 1 ||
          active[0].id !== assignmentId
        ) {
          throw new ConflictException(
            'Exactly one matching active assignment is required. Reload assignment history.',
          );
        }

        const assigned = active[0];
        if (target === 'CHECKED_IN') {
          const noShows = await cancelUnpaidNoShowsInTx(tx, {
            propertyId: properties[0].id,
            reservationId: booking.id,
            actorUserId: actor.id,
            now,
            limit: 1,
          });
          if (noShows.noShowCancelledCount === 1) {
            // Return first so cancellation commits; throw the response afterward.
            return { noShowCancelled: true as const };
          }
        }

        // A planned checkout date does not prove
        // that another checked-in guest has left.
        const otherOccupant =
          await tx.roomAssignment.findFirst({
            where: {
              roomId: assigned.roomId,
              releasedAt: null,
              reservation: {
                status: 'CHECKED_IN',
                id: {
                  not: booking.id,
                },
              },
            },
            select: {
              id: true,
            },
          });

        if (otherOccupant) {
          throw new ConflictException(
            'Another checked-in stay still occupies this room.',
          );
        }

        // Physical access revocation belongs to
        // the future NFC integration.
        const credential =
          await tx.cardAssignment.findFirst({
            where: {
              revokedAt: null,
              OR: [
                {
                  reservationId,
                },
                {
                  roomId: assigned.roomId,
                },
              ],
            },
            select: {
              id: true,
            },
          });

        if (credential) {
          throw new ConflictException(
            'Existing card access requires the NFC revocation workflow before this operation.',
          );
        }

        const paid =
          await requireFullRecordedPayment(
            tx,
            booking.id,
            booking.totalAmountCentavos,
            now,
          );

        if (target === 'CHECKED_OUT') {
          const unresolved = await tx.reservationCharge.findFirst({
            where: {
              reservationId: booking.id,
              OR: [
                { status: 'PENDING' },
                { status: 'APPROVED', OR: [
                  { kind: 'LATE_CHECKOUT', appliedAt: null },
                  { amountCentavos: { gt: 0 }, receipt: { is: null } },
                ] },
              ],
            },
            select: { id: true },
          });
          if (unresolved) throw new ConflictException('Resolve additional charges before checkout.');
        }

        // Every successful check-in has passed full-payment verification above.
        const actualWindow = target === 'CHECKED_IN' && booking.rentalType
          ? actualRentalWindow(booking, now, true) : undefined;

        if (target === 'CHECKED_IN') {
          await this.inventory.assertEligibleInTx(
            tx,
            {
              roomId: assigned.roomId,
              roomTypeId: booking.roomTypeId,
              guestCount: booking.guestCount,
              checkInDate:
                booking.checkInDate
                  .toISOString()
                  .slice(0, 10),
              checkOutDate:
                booking.checkOutDate
                  .toISOString()
                  .slice(0, 10),
              mode: 'IMMEDIATE',
              excludeReservationId: booking.id,
            },
            actualWindow,
          );
        } else if (
          assigned.room.status !== 'OCCUPIED'
        ) {
          throw new ConflictException(
            'The assigned room is not OCCUPIED. Staff review is required.',
          );
        }

        const changed =
          await tx.reservation.updateMany({
            where: {
              id: booking.id,
              status: booking.status,
            },
            data: {
              status: target,
              ...(target === 'CHECKED_IN' ? { actualArrivalAt: now } : { actualDepartureAt: now }),
              ...(actualWindow ? {
                inventoryStartAt: actualWindow.start,
                inventoryEndAt: actualWindow.end,
              } : {}),
            },
          });

        const roomChanged =
          await tx.room.updateMany({
            where: {
              id: assigned.roomId,
              status:
                target === 'CHECKED_IN'
                  ? 'READY'
                  : 'OCCUPIED',
            },
            data: {
              status:
                target === 'CHECKED_IN'
                  ? 'OCCUPIED'
                  : 'CLEANING',
            },
          });

        if (
          changed.count !== 1 ||
          roomChanged.count !== 1
        ) {
          throw new ConflictException(
            'The stay or room changed. Reload before trying again.',
          );
        }

        if (target === 'CHECKED_OUT') {
          const released =
            await tx.roomAssignment.updateMany({
              where: {
                id: assignmentId,
                reservationId,
                releasedAt: null,
              },
              data: {
                releasedAt: now,
              },
            });

          if (released.count !== 1) {
            throw new ConflictException(
              'The assignment changed. Reload its history.',
            );
          }
        }

        await assertInventoryCommitments(
          tx,
          [booking.roomTypeId],
        );

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id, action: 'room.status_changed',
            entityType: 'Room', entityId: assigned.roomId, createdAt: now,
            detailsJson: JSON.stringify({
              from: target === 'CHECKED_IN' ? 'READY' : 'OCCUPIED',
              to: target === 'CHECKED_IN' ? 'OCCUPIED' : 'CLEANING',
              source: target === 'CHECKED_IN' ? 'CHECK_IN' : 'CHECK_OUT',
            }),
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action,
            entityType: 'Reservation',
            entityId: booking.id,
            createdAt: now,
            detailsJson: JSON.stringify({
              assignmentId,
              roomId: assigned.roomId,
              ...(target === 'CHECKED_IN' ? {
                actualArrivalAt: now.toISOString(),
                ...(actualWindow ? { inventoryEndAt: actualWindow.end.toISOString() } : {}),
              } : { actualDepartureAt: now.toISOString() }),
              paymentPolicy:
                'FULL_RECORDED_PAYMENT_V1',
              recordedPaidCentavos: paid,
              ...(target === 'CHECKED_IN'
                ? {
                    identityVerified: true,
                  }
                : {}),
            }),
          },
        });

        return result(false);
      },
    );
    if ('noShowCancelled' in outcome) {
      throw new ConflictException(
        'This unpaid reservation was cancelled as a no-show. Create a new booking after checking availability.',
      );
    }
    return outcome;
  }
}
