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

import { PrismaService } from '../prisma/prisma.service.js';

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

const fields = {
  id: true,
  roomId: true,
  assignedAt: true,
  releasedAt: true,
  room: {
    select: {
      roomNumber: true,
    },
  },
} as const;

type BookingDatabase = Pick<
  Prisma.TransactionClient,
  'property' | 'reservation'
>;

@Injectable()
export class RoomAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventorySafetyService,
  ) {}

  private assertStaff(
    actor: AuthenticatedUser | undefined,
  ): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (
      !['ADMIN', 'MANAGER', 'RECEPTIONIST']
        .includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }
  }

  private async requireBooking(
    db: BookingDatabase,
    id: string,
  ) {
    const properties = await db.property.findMany({
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

    const booking = await db.reservation.findFirst({
      where: {
        id,
        roomType: {
          propertyId: properties[0].id,
        },
      },
      select: {
        id: true,
        roomTypeId: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        guestCount: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        'Reservation not found.',
      );
    }

    return booking;
  }

  async history(
    reservationId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    this.assertStaff(actor);

    await this.requireBooking(
      this.prisma,
      reservationId,
    );

    return this.prisma.roomAssignment.findMany({
      where: {
        reservationId,
      },
      select: fields,
      orderBy: [
        { assignedAt: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  assign(
    reservationId: string,
    roomId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.write(
      reservationId,
      roomId,
      undefined,
      'ASSIGN',
      actor,
    );
  }

  reassign(
    reservationId: string,
    assignmentId: string,
    roomId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.write(
      reservationId,
      roomId,
      assignmentId,
      'REASSIGN',
      actor,
    );
  }

  release(
    reservationId: string,
    assignmentId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.write(
      reservationId,
      undefined,
      assignmentId,
      'RELEASE',
      actor,
    );
  }

  private async write(
    reservationId: string,
    roomId: string | undefined,
    assignmentId: string | undefined,
    operation: 'ASSIGN' | 'REASSIGN' | 'RELEASE',
    actor: AuthenticatedUser | undefined,
  ) {
    this.assertStaff(actor);

    return withInventoryWrite(
      this.prisma,
      async (tx) => {
        const booking = await this.requireBooking(
          tx,
          reservationId,
        );

        const today = todayInPhilippines();

        if (
          booking.status !== 'CONFIRMED' ||
          booking.checkOutDate <= today
        ) {
          throw new ConflictException(
            'Only confirmed reservations with remaining stay dates can change assignments.',
          );
        }

        const active = await tx.roomAssignment.findMany({
          where: {
            reservationId,
            releasedAt: null,
          },
          select: {
            id: true,
            roomId: true,
          },
          take: 2,
        });

        if (active.length > 1) {
          throw new ConflictException(
            'Multiple active assignments need staff review.',
          );
        }

        if (
          operation === 'ASSIGN' &&
          active.length !== 0
        ) {
          throw new ConflictException(
            'This reservation already has an active assignment.',
          );
        }

        if (
          operation !== 'ASSIGN' &&
          (
            active.length !== 1 ||
            active[0].id !== assignmentId
          )
        ) {
          throw new ConflictException(
            'The assignment changed. Reload its history before trying again.',
          );
        }

        if (
          operation === 'REASSIGN' &&
          active[0].roomId === roomId
        ) {
          throw new BadRequestException(
            'Select a different physical room.',
          );
        }

        const now = new Date();

        if (operation !== 'RELEASE') {
          if (!roomId?.trim()) {
            throw new BadRequestException(
              'A physical room is required.',
            );
          }

          await this.inventory.assertEligibleInTx(
            tx,
            {
              roomId,
              roomTypeId: booking.roomTypeId,
              guestCount: booking.guestCount,
              checkInDate: booking.checkInDate
                .toISOString()
                .slice(0, 10),
              checkOutDate: booking.checkOutDate
                .toISOString()
                .slice(0, 10),
              mode:
                booking.checkInDate <= today
                  ? 'IMMEDIATE'
                  : 'FUTURE',
              excludeReservationId: booking.id,
            },
          );
        }

        if (operation !== 'ASSIGN') {
          const released =
            await tx.roomAssignment.updateMany({
              where: {
                id: active[0].id,
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

        const result =
          operation === 'RELEASE'
            ? await tx.roomAssignment.findUniqueOrThrow({
                where: {
                  id: active[0].id,
                },
                select: fields,
              })
            : await tx.roomAssignment.create({
                data: {
                  reservationId,
                  roomId: roomId!,
                  assignedAt: now,
                },
                select: fields,
              });

        // Pinning a room must not strand another
        // booking that has not been assigned yet.
        await assertInventoryCommitments(
          tx,
          [booking.roomTypeId],
        );

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action:
              `reservation.room_assignment.${operation.toLowerCase()}`,
            entityType: 'Reservation',
            entityId: booking.id,
            detailsJson: JSON.stringify({
              assignmentId: result.id,
              roomId: result.roomId,
              ...(operation === 'REASSIGN'
                ? {
                    previousAssignmentId:
                      active[0].id,
                  }
                : {}),
            }),
          },
        });

        return result;
      },
    );
  }
}