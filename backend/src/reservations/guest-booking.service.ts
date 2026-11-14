import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { GuestBookingAttempt, Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GUEST_BOOKING_RECOVERY_MS } from './guest-booking-recovery.config.js';
import { hash } from './reservation-crypto.js';
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
import { HOLD_DURATION_MS } from './reservation-acquisition-policy.js';
import { ReservationAcquisitionService } from './reservation-acquisition.service.js';
import { withInventoryWrite } from './inventory-write.js';

type AccountDatabase = Pick<Prisma.TransactionClient, 'user' | 'guest'>;

@Injectable()
export class GuestBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acquisition: ReservationAcquisitionService,
  ) {}

  private async requireGuest(
    db: AccountDatabase,
    identity: AuthenticatedUser | undefined,
  ) {
    if (!identity?.id || identity.role !== 'GUEST') {
      throw new UnauthorizedException('Sign in with a guest account.');
    }

    const user = await db.user.findUnique({
      where: { id: identity.id },
      select: {
        id: true,
        email: true,
        status: true,
        role: { select: { name: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.role.name !== 'GUEST') {
      throw new UnauthorizedException('An active guest account is required.');
    }

    const guest = await db.guest.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!guest) {
      throw new ConflictException('Your guest profile is unavailable. Contact the property.');
    }

    return { ...guest, userId: user.id, email: user.email };
  }

  async profile(identity: AuthenticatedUser | undefined) {
    return this.prisma.$transaction(async (tx) => {
      const guest = await this.requireGuest(tx, identity);
      return {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
      };
    });
  }

  private credentials(requestId: unknown, recoveryToken: unknown, userId: string) {
    const checked = guestBookingCredentials(requestId, recoveryToken);
    return {
      requestId: checked.requestId,
      recoveryTokenHash: hash(JSON.stringify([
        'guest-account-booking-v1',
        userId,
        checked.requestId,
        checked.recoveryTokenHash,
      ])),
    };
  }

  private authorizeAttempt(
    attempt: GuestBookingAttempt | null,
    recoveryTokenHash: string,
    now: Date,
  ): asserts attempt is GuestBookingAttempt {
    if (
      !attempt ||
      attempt.policyVersion !== GUEST_BOOKING_POLICY_VERSION ||
      !equalGuestDigests(attempt.recoveryTokenHash, recoveryTokenHash) ||
      attempt.recoveryExpiresAt <= now
    ) {
      throw new NotFoundException('Booking recovery is invalid or expired.');
    }
  }

  private async result(
    tx: Prisma.TransactionClient,
    attempt: GuestBookingAttempt,
    userId: string,
    now: Date,
    replayed: boolean,
  ) {
    if (attempt.state !== 'RESERVATION_CREATED' || !attempt.reservationId) {
      throw new ConflictException({
        code: 'BOOKING_REQUEST_IN_PROGRESS',
        message: 'Recover the original booking request before submitting another.',
      });
    }

    const booking = await tx.reservation.findFirst({
      where: { id: attempt.reservationId, guest: { userId } },
      select: {
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

    if (!booking) throw new NotFoundException('Booking not found.');
    if (
      booking.bookingPolicyVersion !== GUEST_BOOKING_POLICY_VERSION ||
      booking.paymentPreference !== attempt.paymentPreference
    ) {
      throw new ConflictException('The booking requires property review.');
    }

    return {
      requestId: attempt.requestId,
      reservationNumber: booking.reservationNumber,
      status: booking.status,
      paymentPreference: booking.paymentPreference,
      expectedArrivalAt: booking.expectedArrivalAt,
      holdExpiresAt: booking.holdExpiresAt,
      firstContactedAt: booking.firstContactedAt,
      responseDeadlineAt: booking.responseDeadlineAt,
      nightlyRateCentavos: booking.nightlyRateCentavos,
      totalAmountCentavos: booking.totalAmountCentavos,
      holdExpired: booking.status === 'PENDING' &&
        booking.holdExpiresAt !== null && booking.holdExpiresAt <= now,
      recoveryExpiresAt: attempt.recoveryExpiresAt,
      replayed,
    };
  }

  async create(input: unknown, identity: AuthenticatedUser | undefined) {
    const submitted = normalizedGuestBooking(input);
    try {
      return await withInventoryWrite(this.prisma, async (tx) => {
        const now = new Date();
        const guest = await this.requireGuest(tx, identity);
        const dto = normalizedGuestBooking({
          ...submitted,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
        });
        const credentials = this.credentials(dto.requestId, dto.recoveryToken, guest.userId);
        const fingerprint = guestBookingFingerprint(dto);
        const existing = await tx.guestBookingAttempt.findUnique({
          where: { requestId: credentials.requestId },
        });

        if (existing) {
          this.authorizeAttempt(existing, credentials.recoveryTokenHash, now);
          if (!equalGuestDigests(existing.requestFingerprint, fingerprint)) {
            throw new ConflictException({
              code: 'BOOKING_REQUEST_CHANGED',
              message: 'Recover the original request before changing its details.',
            });
          }
          return this.result(tx, existing, guest.userId, now, true);
        }

        const timing = initialGuestBookingTiming({
          checkIn: dto.checkIn,
          arrivalTime: dto.arrivalTime,
          paymentPreference: dto.paymentPreference,
        }, now, HOLD_DURATION_MS);
        const attempt = await tx.guestBookingAttempt.create({
          data: {
            requestId: credentials.requestId,
            recoveryTokenHash: credentials.recoveryTokenHash,
            requestFingerprint: fingerprint,
            paymentPreference: dto.paymentPreference,
            policyVersion: GUEST_BOOKING_POLICY_VERSION,
            state: 'PROCESSING',
            recoveryExpiresAt: new Date(now.getTime() + GUEST_BOOKING_RECOVERY_MS),
          },
        });
        const reservation = await this.acquisition.acquireInTx(tx, {
          roomTypeId: dto.roomTypeId,
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          guests: dto.guests,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: dto.phone,
        }, 'HOLD', now, guest.id);

        if (dto.phone) {
          await tx.guest.update({ where: { id: guest.id }, data: { phone: dto.phone } });
        }
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { ...timing, paymentPreference: dto.paymentPreference },
        });
        const completed = await tx.guestBookingAttempt.update({
          where: { id: attempt.id },
          data: { state: 'RESERVATION_CREATED', reservationId: reservation.id },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: guest.userId,
            action: 'reservation.guest_booking_requested',
            entityType: 'Reservation',
            entityId: reservation.id,
            detailsJson: JSON.stringify({
              policyVersion: GUEST_BOOKING_POLICY_VERSION,
              paymentPreference: dto.paymentPreference,
            }),
          },
        });
        return this.result(tx, completed, guest.userId, now, false);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'The booking outcome could not be confirmed. Recover the original request before submitting another.',
      );
    }
  }

  async recover(
    requestId: unknown,
    recoveryToken: unknown,
    identity: AuthenticatedUser | undefined,
  ) {
    try {
      return await withInventoryWrite(this.prisma, async (tx) => {
        const now = new Date();
        const guest = await this.requireGuest(tx, identity);
        const credentials = this.credentials(requestId, recoveryToken, guest.userId);
        const attempt = await tx.guestBookingAttempt.findUnique({
          where: { requestId: credentials.requestId },
        });
        this.authorizeAttempt(attempt, credentials.recoveryTokenHash, now);
        return this.result(tx, attempt, guest.userId, now, true);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Booking recovery is temporarily unavailable.');
    }
  }
}
