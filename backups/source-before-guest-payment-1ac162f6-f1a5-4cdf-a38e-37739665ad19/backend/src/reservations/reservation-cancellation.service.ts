import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  withInventoryWrite,
} from './inventory-write.js';

import {
  assertReservationTransition,
} from './reservation-lifecycle.js';

import {
  UNPAID_CANCELLATION_POLICY,
} from './cancellation-policy.js';

@Injectable()
export class ReservationCancellationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async cancel(
    reservationId: string,
    reason: string,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (
      ![
        'ADMIN',
        'MANAGER',
        'RECEPTIONIST',
      ].includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }

    const cleanedReason =
      typeof reason === 'string'
        ? reason.trim().replace(/\s+/g, ' ')
        : '';

    if (
      cleanedReason.length < 3 ||
      cleanedReason.length > 500
    ) {
      throw new BadRequestException(
        'A cancellation reason of 3–500 characters is required.',
      );
    }

    return withInventoryWrite(
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
              status: true,
              checkOutDate: true,
              holdExpiresAt: true,
            },
          });

        if (!booking) {
          throw new NotFoundException(
            'Reservation not found.',
          );
        }

        if (booking.status === 'CANCELLED') {
          // A retry preserves the original reason,
          // audit event and financial history.
          return {
            reservationNumber:
              booking.reservationNumber,
            status: 'CANCELLED' as const,
            alreadyCancelled: true,
            releasedAssignmentCount: 0,
          };
        }

        assertReservationTransition(
          booking.status,
          'CANCELLED',
        );

        const now = new Date();
        const today = todayInPhilippines();

        if (booking.checkOutDate <= today) {
          throw new ConflictException(
            'The stay has ended and cannot use this cancellation operation.',
          );
        }

        if (
          booking.status === 'PENDING' &&
          booking.holdExpiresAt &&
          booking.holdExpiresAt <= now
        ) {
          throw new ConflictException(
            'This hold has expired. Use the hold-expiration workflow.',
          );
        }

        // Conservative boundary until Phase 7:
        // any payment record requires financial review,
        // including UNPAID, FAILED and REFUNDED records.
        const payment =
          await tx.payment.findFirst({
            where: {
              reservationId,
            },
            select: {
              id: true,
            },
          });

        if (payment) {
          throw new ConflictException(
            'This booking has payment records and requires financial review before cancellation.',
          );
        }

        const changed =
          await tx.reservation.updateMany({
            where: {
              id: booking.id,
              status: booking.status,
              checkOutDate: {
                gt: today,
              },
              ...(booking.status === 'PENDING'
                ? {
                    OR: [
                      {
                        holdExpiresAt: null,
                      },
                      {
                        holdExpiresAt: {
                          gt: now,
                        },
                      },
                    ],
                  }
                : {}),
            },
            data: {
              status: 'CANCELLED',
            },
          });

        if (changed.count !== 1) {
          throw new ConflictException(
            'The reservation changed. Reload it before trying again.',
          );
        }

        const released =
          await tx.roomAssignment.updateMany({
            where: {
              reservationId,
              releasedAt: null,
            },
            data: {
              releasedAt: now,
            },
          });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'reservation.cancelled',
            entityType: 'Reservation',
            entityId: booking.id,
            detailsJson: JSON.stringify({
              reason: cleanedReason,
              previousStatus: booking.status,
              releasedAssignmentCount:
                released.count,
              policy:
                UNPAID_CANCELLATION_POLICY,
            }),
          },
        });

        return {
          reservationNumber:
            booking.reservationNumber,
          status: 'CANCELLED' as const,
          alreadyCancelled: false,
          releasedAssignmentCount:
            released.count,
        };
      },
    );
  }
}