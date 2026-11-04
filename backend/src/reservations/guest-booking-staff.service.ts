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
  Reservation,
} from '../generated/prisma/client.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  GUEST_BOOKING_POLICY_VERSION,
  payAtPropertyDeadlines,
} from './guest-booking-policy.js';

import {
  assertInventoryCommitments,
  withInventoryWrite,
} from './inventory-write.js';

import {
  expirePendingHoldsInTx,
} from './reservation-lifecycle.js';

const STAFF_ROLES = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
];

const CONTACT_ACTION =
  'reservation.guest_contact_recorded';

const CONFIRM_ACTION =
  'reservation.guest_request_confirmed';

const REJECT_ACTION =
  'reservation.guest_request_rejected';

type StaffAction =
  | {
      kind: 'CONTACT';
      channel: 'PHONE' | 'EMAIL';
    }
  | {
      kind: 'CONFIRM';
    }
  | {
      kind: 'REJECT';
      reason: string;
    };

function receipt(booking: Reservation) {
  return {
    id: booking.id,
    reservationNumber: booking.reservationNumber,
    status: booking.status,
    paymentPreference: booking.paymentPreference,
    expectedArrivalAt: booking.expectedArrivalAt,
    firstContactedAt: booking.firstContactedAt,
    responseDeadlineAt: booking.responseDeadlineAt,
    holdExpiresAt: booking.holdExpiresAt,
    confirmedAt: booking.confirmedAt,
  };
}

@Injectable()
export class GuestBookingStaffService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  contact(
    actor: AuthenticatedUser | undefined,
    reservationId: string,
    channel: unknown,
  ) {
    if (
      channel !== 'PHONE' &&
      channel !== 'EMAIL'
    ) {
      throw new BadRequestException(
        'Choose phone or email contact.',
      );
    }

    return this.run(
      actor,
      reservationId,
      {
        kind: 'CONTACT',
        channel,
      },
    );
  }

  confirm(
    actor: AuthenticatedUser | undefined,
    reservationId: string,
    guestAgreed: unknown,
  ) {
    if (guestAgreed !== true) {
      throw new BadRequestException(
        'Record the guest’s agreement before confirming.',
      );
    }

    return this.run(
      actor,
      reservationId,
      {
        kind: 'CONFIRM',
      },
    );
  }

  reject(
    actor: AuthenticatedUser | undefined,
    reservationId: string,
    reason: unknown,
  ) {
    if (
      typeof reason !== 'string' ||
      reason.trim().length < 3 ||
      reason.trim().length > 500
    ) {
      throw new BadRequestException(
        'Provide a rejection reason of 3 to 500 characters.',
      );
    }

    return this.run(
      actor,
      reservationId,
      {
        kind: 'REJECT',
        reason: reason.trim(),
      },
    );
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    reservationId: string,
    action: string,
    details: Record<string, unknown>,
  ) {
    await tx.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: 'Reservation',
        entityId: reservationId,
        detailsJson: JSON.stringify({
          policyVersion:
            GUEST_BOOKING_POLICY_VERSION,
          paymentPreference:
            'PAY_AT_PROPERTY',
          ...details,
        }),
      },
    });
  }

  private async run(
    actor: AuthenticatedUser | undefined,
    reservationId: string,
    action: StaffAction,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (!STAFF_ROLES.includes(actor.role)) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }

    if (
      typeof reservationId !== 'string' ||
      !reservationId.trim() ||
      reservationId.length > 200
    ) {
      throw new BadRequestException(
        'Invalid reservation identifier.',
      );
    }

    const actorId = actor.id;
    const actorRole = actor.role;

    const outcome = await withInventoryWrite(
      this.prisma,
      async (tx) => {
        const now = new Date();

        const staff = await tx.user.findUnique({
          where: {
            id: actorId,
          },
          select: {
            status: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        });

        if (
          !staff ||
          staff.status !== 'ACTIVE' ||
          staff.role.name !== actorRole ||
          !STAFF_ROLES.includes(staff.role.name)
        ) {
          throw new ForbiddenException(
            'Current staff permission is required.',
          );
        }

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

        const propertyId = properties[0].id;

        const booking =
          await tx.reservation.findFirst({
            where: {
              id: reservationId,
              roomType: {
                propertyId,
              },
            },
          });

        if (!booking) {
          throw new NotFoundException(
            'Reservation not found.',
          );
        }

        if (
          booking.bookingPolicyVersion !==
            GUEST_BOOKING_POLICY_VERSION ||
          booking.paymentPreference !==
            'PAY_AT_PROPERTY'
        ) {
          throw new ConflictException(
            'This action requires a new Pay at Property request.',
          );
        }

        const repeatedAction =
          action.kind === 'CONFIRM' &&
          booking.status === 'CONFIRMED'
            ? CONFIRM_ACTION
            : action.kind === 'REJECT' &&
                booking.status === 'CANCELLED'
              ? REJECT_ACTION
              : null;

        if (repeatedAction) {
          const original =
            await tx.auditLog.findFirst({
              where: {
                entityType: 'Reservation',
                entityId: booking.id,
                action: repeatedAction,
              },
              select: {
                id: true,
              },
            });

          if (original) {
            return {
              booking: receipt(booking),
            };
          }
        }

        if (booking.status !== 'PENDING') {
          throw new ConflictException(
            'Only pending requests can use this action.',
          );
        }

        if (
          !booking.expectedArrivalAt ||
          !booking.holdExpiresAt
        ) {
          throw new ConflictException(
            'The booking timing requires review.',
          );
        }

        const deadlines =
          payAtPropertyDeadlines(
            booking.expectedArrivalAt,
            booking.firstContactedAt,
          );

        if (
          booking.holdExpiresAt.getTime() !==
            deadlines.holdExpiresAt.getTime() ||
          (
            booking.responseDeadlineAt?.getTime() ??
            null
          ) !==
            (
              deadlines.responseDeadlineAt?.getTime() ??
              null
            )
        ) {
          throw new ConflictException(
            'The booking deadlines require review.',
          );
        }

        const paymentCount =
          await tx.payment.count({
            where: {
              reservationId: booking.id,
            },
          });

        if (paymentCount !== 0) {
          throw new ConflictException(
            'Existing payment records require financial review.',
          );
        }

        if (booking.holdExpiresAt <= now) {
          await expirePendingHoldsInTx(
            tx,
            {
              propertyId,
              reservationId: booking.id,
              now,
              actorUserId: actorId,
            },
          );

          return {
            conflict:
              'The request deadline has passed. The pending request was cancelled.',
          };
        }

        if (action.kind === 'CONTACT') {
          const firstContactedAt =
            booking.firstContactedAt ?? now;

          const contactedDeadlines =
            payAtPropertyDeadlines(
              booking.expectedArrivalAt,
              firstContactedAt,
            );

          const updated =
            await tx.reservation.update({
              where: {
                id: booking.id,
              },
              data: {
                firstContactedAt,
                responseDeadlineAt:
                  contactedDeadlines.responseDeadlineAt,
                holdExpiresAt:
                  contactedDeadlines.holdExpiresAt,
              },
            });

          await this.audit(
            tx,
            actorId,
            booking.id,
            CONTACT_ACTION,
            {
              channel: action.channel,
              contactedAt: now.toISOString(),
              firstContactedAt:
                firstContactedAt.toISOString(),
              responseDeadlineAt:
                contactedDeadlines
                  .responseDeadlineAt
                  ?.toISOString(),
              holdExpiresAt:
                contactedDeadlines
                  .holdExpiresAt
                  .toISOString(),
            },
          );

          return {
            booking: receipt(updated),
          };
        }

        if (action.kind === 'CONFIRM') {
          if (
            !booking.firstContactedAt ||
            !booking.responseDeadlineAt
          ) {
            throw new ConflictException(
              'Record staff contact before confirming.',
            );
          }

          const claimed =
            await tx.reservation.updateMany({
              where: {
                id: booking.id,
                status: 'PENDING',
                bookingPolicyVersion:
                  GUEST_BOOKING_POLICY_VERSION,
                paymentPreference:
                  'PAY_AT_PROPERTY',
                holdExpiresAt: {
                  equals: booking.holdExpiresAt,
                  gt: now,
                },
              },
              data: {
                status: 'CONFIRMED',
                confirmedAt: now,
                holdExpiresAt: null,
              },
            });

          if (claimed.count !== 1) {
            throw new ConflictException(
              'The booking changed. Refresh its details.',
            );
          }

          await assertInventoryCommitments(
            tx,
            [booking.roomTypeId],
          );

          await this.audit(
            tx,
            actorId,
            booking.id,
            CONFIRM_ACTION,
            {
              guestAgreed: true,
              confirmedAt: now.toISOString(),
            },
          );

          const updated =
            await tx.reservation.findUniqueOrThrow({
              where: {
                id: booking.id,
              },
            });

          return {
            booking: receipt(updated),
          };
        }

        const claimed =
          await tx.reservation.updateMany({
            where: {
              id: booking.id,
              status: 'PENDING',
              bookingPolicyVersion:
                GUEST_BOOKING_POLICY_VERSION,
              paymentPreference:
                'PAY_AT_PROPERTY',
              holdExpiresAt: {
                equals: booking.holdExpiresAt,
                gt: now,
              },
            },
            data: {
              status: 'CANCELLED',
            },
          });

        if (claimed.count !== 1) {
          throw new ConflictException(
            'The booking changed. Refresh its details.',
          );
        }

        const released =
          await tx.roomAssignment.updateMany({
            where: {
              reservationId: booking.id,
              releasedAt: null,
            },
            data: {
              releasedAt: now,
            },
          });

        await this.audit(
          tx,
          actorId,
          booking.id,
          REJECT_ACTION,
          {
            reason: action.reason,
            rejectedAt: now.toISOString(),
            releasedAssignmentCount:
              released.count,
          },
        );

        const updated =
          await tx.reservation.findUniqueOrThrow({
            where: {
              id: booking.id,
            },
          });

        return {
          booking: receipt(updated),
        };
      },
    );

    if (outcome.conflict) {
      throw new ConflictException(
        outcome.conflict,
      );
    }

    if (!outcome.booking) {
      throw new InternalServerErrorException(
        'The booking outcome is unavailable.',
      );
    }

    return outcome.booking;
  }
}