import {
  Injectable,
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
            OR: [
              {
                status: {
                  in: ['CONFIRMED', 'CHECKED_IN'],
                },
              },
              {
                status: 'PENDING',
                holdExpiresAt: { gt: now },
              },
            ],
          },
        });

      const expectedArrivals =
        await tx.reservation.count({
          where: {
            roomType,
            status: 'CONFIRMED',
            checkInDate: period.stayDate,
          },
        });

      const expectedDepartures =
        await tx.reservation.count({
          where: {
            roomType,
            status: 'CHECKED_IN',
            checkOutDate: period.stayDate,
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