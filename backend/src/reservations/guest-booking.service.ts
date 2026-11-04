import {
  randomBytes,
} from 'node:crypto';

import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type {
  GuestBookingAttempt,
  Prisma,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  BOOKING_SESSION_MS,
} from './booking-access.config.js';

import {
  hash,
} from './booking-access-security.js';

import {
  GUEST_BOOKING_POLICY_VERSION,
  initialGuestBookingTiming,
} from './guest-booking-policy.js';

import {
  equalGuestDigests,
  guestBookingCredentials,
  guestBookingFingerprint,
  normalizedGuestBooking,
} from './guest-booking-security.js';

import {
  HOLD_DURATION_MS,
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

import {
  withInventoryWrite,
} from './inventory-write.js';

@Injectable()
export class GuestBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acquisition:
      ReservationAcquisitionService,
  ) {}

  private authorizeAttempt(
    attempt: GuestBookingAttempt | null,
    recoveryTokenHash: string,
    now: Date,
  ): asserts attempt is GuestBookingAttempt {
    if (
      !attempt ||
      attempt.policyVersion !==
        GUEST_BOOKING_POLICY_VERSION ||
      !equalGuestDigests(
        attempt.recoveryTokenHash,
        recoveryTokenHash,
      ) ||
      attempt.recoveryExpiresAt <= now
    ) {
      throw new NotFoundException(
        'Booking recovery is invalid or expired.',
      );
    }
  }

  private async result(
    tx: Prisma.TransactionClient,
    attempt: GuestBookingAttempt,
    now: Date,
    replayed: boolean,
  ) {
    if (
      attempt.state !==
        'RESERVATION_CREATED' ||
      !attempt.reservationId
    ) {
      throw new ConflictException({
        code: 'BOOKING_REQUEST_IN_PROGRESS',
        message:
          'Recover the original booking request before submitting another.',
      });
    }

    const booking =
      await tx.reservation.findUnique({
        where: {
          id: attempt.reservationId,
        },
        select: {
          id: true,
          reservationNumber: true,
          status: true,
          bookingPolicyVersion: true,
          paymentPreference: true,
          expectedArrivalAt: true,
          holdExpiresAt: true,
          firstContactedAt: true,
          responseDeadlineAt: true,
          nightlyRateCentavos: true,
          totalAmountCentavos: true,
        },
      });

    if (
      !booking ||
      booking.bookingPolicyVersion !==
        GUEST_BOOKING_POLICY_VERSION ||
      booking.paymentPreference !==
        attempt.paymentPreference
    ) {
      throw new ConflictException(
        'The booking requires property review.',
      );
    }

    const sessionToken =
      randomBytes(32).toString('hex');

    const expiresAt = new Date(
      now.getTime() + BOOKING_SESSION_MS,
    );

    await tx.reservationAccessSession.create({
      data: {
        reservationId: booking.id,
        tokenHash: hash(sessionToken),
        expiresAt,
      },
    });

    return {
      receipt: {
        requestId: attempt.requestId,
        reservationNumber:
          booking.reservationNumber,
        status: booking.status,
        paymentPreference:
          booking.paymentPreference,
        expectedArrivalAt:
          booking.expectedArrivalAt,
        holdExpiresAt:
          booking.holdExpiresAt,
        firstContactedAt:
          booking.firstContactedAt,
        responseDeadlineAt:
          booking.responseDeadlineAt,
        nightlyRateCentavos:
          booking.nightlyRateCentavos,
        totalAmountCentavos:
          booking.totalAmountCentavos,
        holdExpired:
          booking.status === 'PENDING' &&
          booking.holdExpiresAt !== null &&
          booking.holdExpiresAt <= now,
      },
      session: {
        token: sessionToken,
        expiresAt,
      },
      replayed,
    };
  }

  async create(input: unknown) {
    const dto = normalizedGuestBooking(input);

    const credentials =
      guestBookingCredentials(
        dto.requestId,
        dto.recoveryToken,
      );

    const fingerprint =
      guestBookingFingerprint(dto);

    try {
      return await withInventoryWrite(
        this.prisma,
        async (tx) => {
          const now = new Date();

          const existing =
            await tx.guestBookingAttempt.findUnique({
              where: {
                requestId:
                  credentials.requestId,
              },
            });

          if (existing) {
            this.authorizeAttempt(
              existing,
              credentials.recoveryTokenHash,
              now,
            );

            if (
              !equalGuestDigests(
                existing.requestFingerprint,
                fingerprint,
              )
            ) {
              throw new ConflictException({
                code: 'BOOKING_REQUEST_CHANGED',
                message:
                  'The original booking request cannot be changed during recovery.',
              });
            }

            return this.result(
              tx,
              existing,
              now,
              true,
            );
          }

          const reusedCredential =
            await tx.guestBookingAttempt.findUnique({
              where: {
                recoveryTokenHash:
                  credentials.recoveryTokenHash,
              },
              select: {
                id: true,
              },
            });

          if (reusedCredential) {
            throw new ConflictException({
              code: 'BOOKING_RECOVERY_REUSED',
              message:
                'This recovery credential already belongs to another request.',
            });
          }

          const timing =
            initialGuestBookingTiming(
              {
                checkIn: dto.checkIn,
                arrivalTime: dto.arrivalTime,
                paymentPreference:
                  dto.paymentPreference,
              },
              now,
              HOLD_DURATION_MS,
            );

          const attempt =
            await tx.guestBookingAttempt.create({
              data: {
                requestId:
                  credentials.requestId,
                recoveryTokenHash:
                  credentials.recoveryTokenHash,
                requestFingerprint:
                  fingerprint,
                paymentPreference:
                  dto.paymentPreference,
                policyVersion:
                  GUEST_BOOKING_POLICY_VERSION,
                state: 'PROCESSING',
                recoveryExpiresAt: new Date(
                  now.getTime() +
                    BOOKING_SESSION_MS,
                ),
              },
            });

          const reservation =
            await this.acquisition.acquireInTx(
              tx,
              {
                roomTypeId: dto.roomTypeId,
                checkIn: dto.checkIn,
                checkOut: dto.checkOut,
                guests: dto.guests,
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
              },
              'HOLD',
              now,
            );

          await tx.reservation.update({
            where: {
              id: reservation.id,
            },
            data: {
              ...timing,
              paymentPreference:
                dto.paymentPreference,
            },
          });

          const completed =
            await tx.guestBookingAttempt.update({
              where: {
                id: attempt.id,
              },
              data: {
                state:
                  'RESERVATION_CREATED',
                reservationId:
                  reservation.id,
              },
            });

          await tx.auditLog.create({
            data: {
              actorUserId: null,
              action:
                'reservation.guest_booking_requested',
              entityType: 'Reservation',
              entityId: reservation.id,
              detailsJson: JSON.stringify({
                policyVersion:
                  GUEST_BOOKING_POLICY_VERSION,
                paymentPreference:
                  dto.paymentPreference,
              }),
            },
          });

          return this.result(
            tx,
            completed,
            now,
            false,
          );
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'The booking outcome could not be confirmed. Recover the original request before submitting another.',
      );
    }
  }

  async recover(
    requestId: unknown,
    recoveryToken: unknown,
  ) {
    const credentials =
      guestBookingCredentials(
        requestId,
        recoveryToken,
      );

    try {
      return await withInventoryWrite(
        this.prisma,
        async (tx) => {
          const now = new Date();

          const attempt =
            await tx.guestBookingAttempt.findUnique({
              where: {
                requestId:
                  credentials.requestId,
              },
            });

          this.authorizeAttempt(
            attempt,
            credentials.recoveryTokenHash,
            now,
          );

          return this.result(
            tx,
            attempt,
            now,
            true,
          );
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'Booking recovery is temporarily unavailable.',
      );
    }
  }
}