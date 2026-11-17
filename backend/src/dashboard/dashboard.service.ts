import { inventoryReservationWhere } from '../reservations/inventory-reservation.js';
import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  paymentEvidenceSelect,
} from '../payments/payment-evidence.js';

import {
  dashboardPeriod,
  financialMetrics,
} from './dashboard-metrics.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { GUEST_BOOKING_POLICY_VERSION } from '../reservations/guest-booking-policy.js';
import { STAFF_ROLES } from '../reservations/guest-booking-staff-policy.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async propertyId(
    tx: Prisma.TransactionClient,
  ) {
    const properties = await tx.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    return properties[0].id;
  }

  summary() {
    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);
      const now = new Date();
      const period = dashboardPeriod(now);
      const roomType = { propertyId };

      const totalRooms = await tx.room.count({
        where: { roomType },
      });

      const occupied =
        await tx.roomAssignment.findMany({
          where: {
            releasedAt: null,
            room: { roomType },
            reservation: {
              status: 'CHECKED_IN',
              roomType,
            },
          },
          select: { roomId: true },
          distinct: ['roomId'],
        });

      const activeReservations =
        await tx.reservation.count({
          where: {
            roomType,
            AND: [inventoryReservationWhere(now)],
          },
        });

      const expectedArrivals =
        await tx.reservation.count({
          where: {
            roomType,
            status: 'CONFIRMED',
            OR: [
              {
                rentalType: { not: null },
                scheduledArrivalAt: { gte: period.start, lt: period.end },
              },
              { rentalType: null, checkInDate: period.stayDate },
            ],
          },
        });

      const expectedDepartures =
        await tx.reservation.count({
          where: {
            roomType,
            status: 'CHECKED_IN',
            OR: [
              {
                rentalType: { not: null },
                inventoryEndAt: { gte: period.start, lt: period.end },
              },
              { rentalType: null, checkOutDate: period.stayDate },
            ],
          },
        });

      return {
        asOf: now.toISOString(),
        date: period.date,
        timezone: 'Asia/Manila' as const,
        totalRooms,
        occupiedRooms: occupied.length,
        activeReservations,
        expectedArrivals,
        expectedDepartures,
      };
    });
  }

  contactQueue(actor: AuthenticatedUser | undefined) {
    if (!actor?.id) {
      throw new UnauthorizedException('Sign in with a staff account.');
    }
    if (!STAFF_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Staff permission is required.');
    }
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.user.findUnique({
        where: { id: actor.id },
        select: { status: true, role: { select: { name: true } } },
      });
      if (!staff || staff.status !== 'ACTIVE' || staff.role.name !== actor.role ||
          !STAFF_ROLES.includes(staff.role.name)) {
        throw new ForbiddenException('Current staff permission is required.');
      }
      const propertyId = await this.propertyId(tx);
      const now = new Date();
      const where = {
        roomType: { propertyId },
        status: 'PENDING',
        paymentPreference: 'PAY_AT_PROPERTY',
        bookingPolicyVersion: GUEST_BOOKING_POLICY_VERSION,
      } satisfies Prisma.ReservationWhereInput;
      const total = await tx.reservation.count({ where });
      const rows = await tx.reservation.findMany({
        where, take: 20,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true, reservationNumber: true, expectedArrivalAt: true,
          holdExpiresAt: true, firstContactedAt: true,
          guest: { select: { firstName: true, lastName: true } },
        },
      });
      return {
        asOf: now.toISOString(), timezone: 'Asia/Manila' as const, total, limit: 20,
        items: rows.map((row) => ({
          id: row.id, reservationNumber: row.reservationNumber, guest: row.guest,
          expectedArrivalAt: row.expectedArrivalAt, deadlineAt: row.holdExpiresAt,
          firstContactedAt: row.firstContactedAt,
          attention: row.firstContactedAt
            ? 'AWAITING_CONFIRMATION' as const : 'INITIAL_CONTACT_NEEDED' as const,
          deadlineReached: row.holdExpiresAt !== null &&
            row.holdExpiresAt.getTime() <= now.getTime(),
        })),
      };
    });
  }

  financialSummary() {
    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);
      const now = new Date();

      const { date, start, end } =
        dashboardPeriod(now);

      const bookings =
        await tx.reservation.findMany({
          where: {
            roomType: { propertyId },
            payments: {
              some: {
                OR: [
                  {
                    paidAt: {
                      gte: start,
                      lt: end,
                    },
                  },
                  {
                    paidAt: { gt: now },
                  },
                  {
                    paidAt: null,
                    status: {
                      in: [
                        'PAID',
                        'PARTIALLY_REFUNDED',
                        'REFUNDED',
                      ],
                    },
                  },
                  {
                    status: 'PARTIALLY_PAID',
                  },
                  {
                    refunds: {
                      some: {
                        status: 'COMPLETED',
                        OR: [
                          {
                            completedAt: {
                              gte: start,
                              lt: end,
                            },
                          },
                          {
                            completedAt: null,
                          },
                          {
                            completedAt: { gt: now },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
          select: {
            totalAmountCentavos: true,
            status: true,
            payments: {
              select: {
                id: true,
                method: true,
                status: true,
                amountCentavos: true,
                currency: true,
                paidAt: true,
                provider: true,
                providerCheckoutId: true,
                providerPaymentId: true,
                events: {
                  select: paymentEvidenceSelect,
                },
                refunds: {
                  select: {
                    amountCentavos: true,
                    status: true,
                    completedAt: true,
                  },
                },
              },
            },
          },
        });

      return {
        asOf: now.toISOString(),
        date,
        timezone: 'Asia/Manila' as const,
        currency: 'PHP' as const,
        ...financialMetrics(bookings, now),
      };
    });
  }
}
