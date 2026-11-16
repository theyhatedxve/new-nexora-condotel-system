import { guestCancellationPolicy } from './guest-cancellation-policy.js';
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

import { remainingReservationWhere, stayHasEnded } from '../common/inventory/reservation-window.js';

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

  cancel(reservationId: string, reason: string, actor: AuthenticatedUser | undefined) {
    return this.cancelReservation(reservationId, reason, actor, false);
  }

  cancelForGuest(reservationId: string, reason: string, actor: AuthenticatedUser | undefined) {
    return this.cancelReservation(reservationId, reason, actor, true);
  }

  private async cancelReservation(
    reservationId: string,
    reason: string,
    actor: AuthenticatedUser | undefined,
    guestRequested: boolean,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (
      guestRequested ? actor.role !== 'GUEST' : ![
        'SUPER_ADMIN',
        'ADMIN',
        'MANAGER',
        'RECEPTIONIST',
      ].includes(actor.role)
    ) {
      throw new ForbiddenException(
        guestRequested ? 'Sign in with a guest account.' : 'Staff permission is required.',
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
              ...(guestRequested ? { guest: { userId: actor.id } } : {}),
              roomType: {
                propertyId: properties[0].id,
              },
            },
            select: {
              id: true,
              reservationNumber: true,
              status: true,
              inventoryEndAt: true,
              checkOutDate: true,
              holdExpiresAt: true,
              confirmedAt: true,
              bookingPolicyVersion: true,
              paymentPreference: true,
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

        if (stayHasEnded(booking, now)) {
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

        const guestPolicy = guestRequested
          ? guestCancellationPolicy(booking, Boolean(payment), now)
          : null;
        if (guestPolicy && !guestPolicy.unpaidEligible) {
          throw new ConflictException(guestPolicy.reason);
        }

        const changed =
          await tx.reservation.updateMany({
            where: {
              id: booking.id,
              status: booking.status,
              payments: { none: {} },
              ...(guestRequested ? { confirmedAt: booking.confirmedAt } : {}),
              AND: [remainingReservationWhere(now)],
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
              ...(guestRequested ? { source: 'GUEST_SELF_SERVICE' } : {}),
              previousStatus: booking.status,
              releasedAssignmentCount:
                released.count,
              policy:
                guestPolicy ?? UNPAID_CANCELLATION_POLICY,
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
