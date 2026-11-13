import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  OwnershipService,
  type AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import { PaymentSummaryService } from '../payments/payment-summary.service.js';

import { UNPAID_CANCELLATION_POLICY } from './cancellation-policy.js';

import { GuestReservationListDto } from './dto/guest-reservation-list.dto.js';

const RESERVATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const GUEST_RESERVATION_SELECT = {
  id: true,
  reservationNumber: true,
  status: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  paymentPreference: true,
  expectedArrivalAt: true,
  nightlyRateCentavos: true,
  totalAmountCentavos: true,
  holdExpiresAt: true,
  createdAt: true,
  roomType: {
    select: {
      name: true,
    },
  },
} as const;

function isHoldExpired(
  status: string,
  holdExpiresAt: Date | null,
  nowMs: number,
): boolean {
  return (
    status === 'PENDING' &&
    holdExpiresAt !== null &&
    holdExpiresAt.getTime() <= nowMs
  );
}

@Injectable()
export class GuestReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
    private readonly summaries: PaymentSummaryService,
  ) {}

  private requireGuest(
    identity: AuthenticatedUser | undefined,
  ): AuthenticatedUser {
    if (!identity?.id || identity.role !== 'GUEST') {
      throw new UnauthorizedException('Sign in with a guest account.');
    }

    return identity;
  }

  async listForGuest(
    identity: AuthenticatedUser | undefined,
    query: GuestReservationListDto = new GuestReservationListDto(),
  ) {
    const guestIdentity = this.requireGuest(identity);
    const requestedPage = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.prisma.$transaction(async (tx) => {
      const where = {
        guest: {
          userId: guestIdentity.id,
        },
      };

      const total = await tx.reservation.count({ where });
      const totalPages = Math.ceil(total / limit);
      const page =
        total === 0 ? 1 : Math.min(requestedPage, totalPages);

      const rows = await tx.reservation.findMany({
        where,
        select: GUEST_RESERVATION_SELECT,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      });

      const nowMs = Date.now();
      const items = rows.map((row) => ({
        ...row,
        holdExpired: isHoldExpired(row.status, row.holdExpiresAt, nowMs),
      }));

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    });
  }

  async findOneForGuest(
    id: string,
    identity: AuthenticatedUser | undefined,
  ) {
    const guestIdentity = this.requireGuest(identity);

    if (typeof id !== 'string' || !RESERVATION_ID_PATTERN.test(id)) {
      throw new NotFoundException('Record not found.');
    }

    const reservation = await this.prisma.$transaction(async (tx) => {
      await this.ownership.assertReservationAccess(
        guestIdentity,
        id,
        [],
        tx,
      );

      const booking = await tx.reservation.findUnique({
        where: { id },
        select: {
          ...GUEST_RESERVATION_SELECT,
          bookingPolicyVersion: true,
          firstContactedAt: true,
          responseDeadlineAt: true,
          confirmedAt: true,
          guest: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          payments: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Record not found.');
      }

      return booking;
    });

    const paymentSummary = await this.summaries.forUser(id, guestIdentity);
    const { payments, ...projection } = reservation;
    const unpaidEligible =
      ['PENDING', 'CONFIRMED'].includes(reservation.status) &&
      payments.length === 0;

    return {
      ...projection,
      holdExpired: isHoldExpired(
        reservation.status,
        reservation.holdExpiresAt,
        Date.now(),
      ),
      paymentSummary,
      cancellationPolicy: {
        version: UNPAID_CANCELLATION_POLICY.version,
        cancellationFeeCentavos:
          UNPAID_CANCELLATION_POLICY.cancellationFeeCentavos,
        text: UNPAID_CANCELLATION_POLICY.text,
        unpaidEligible,
      },
    };
  }
}
