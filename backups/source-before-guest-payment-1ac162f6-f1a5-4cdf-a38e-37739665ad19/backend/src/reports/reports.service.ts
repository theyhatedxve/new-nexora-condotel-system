import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  parsePhilippineDate,
} from '../common/validation/philippine-date-range.js';

import {
  dashboardPeriod,
  financialMetrics,
} from '../dashboard/dashboard-metrics.js';

import {
  paymentEvidenceSelect,
} from '../payments/payment-evidence.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import type {
  CollectionsReportQueryDto,
} from './dto/collections-report-query.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private range(
    query: CollectionsReportQueryDto,
    now: Date,
  ) {
    const today = dashboardPeriod(now).date;

    if (
      (query.from === undefined) !==
      (query.to === undefined)
    ) {
      throw new BadRequestException(
        'Provide both from and to dates.',
      );
    }

    const from = query.from ?? today;
    const to = query.to ?? today;

    const firstDate = parsePhilippineDate(from);
    const lastDate = parsePhilippineDate(to);
    const todayDate = parsePhilippineDate(today);

    if (firstDate > lastDate) {
      throw new BadRequestException(
        'From date must not be after To date.',
      );
    }

    if (lastDate > todayDate) {
      throw new BadRequestException(
        'Report dates must not be in the future.',
      );
    }

    const days =
      (lastDate.getTime() -
        firstDate.getTime()) / DAY_MS + 1;

    if (days > 31) {
      throw new BadRequestException(
        'Select no more than 31 calendar days.',
      );
    }

    const start =
      new Date(`${from}T00:00:00+08:00`);

    const end = new Date(
      new Date(`${to}T00:00:00+08:00`).getTime() +
        DAY_MS,
    );

    return {
      from,
      to,
      days,
      start,
      end,
    };
  }

  collections(query: CollectionsReportQueryDto) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const range = this.range(query, now);

      const properties = await tx.property.findMany({
        select: { id: true },
        take: 2,
      });

      if (properties.length !== 1) {
        throw new InternalServerErrorException(
          'Exactly one property must be configured.',
        );
      }

      const propertyId = properties[0].id;

      const bookings =
        await tx.reservation.findMany({
          where: {
            roomType: { propertyId },
            payments: {
              some: {
                OR: [
                  {
                    paidAt: {
                      gte: range.start,
                      lt: range.end,
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
                              gte: range.start,
                              lt: range.end,
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
        from: range.from,
        to: range.to,
        days: range.days,
        asOf: now.toISOString(),
        timezone: 'Asia/Manila' as const,
        currency: 'PHP' as const,
        ...financialMetrics(
          bookings,
          now,
          {
            start: range.start,
            end: range.end,
          },
        ),
      };
    });
  }
}