import { collectionsReportRange } from './collections-report-range.js';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { financialMetrics } from '../dashboard/dashboard-metrics.js';

import { paymentEvidenceSelect } from '../payments/payment-evidence.js';

import { PrismaService } from '../prisma/prisma.service.js';

import type { CollectionsReportQueryDto } from './dto/collections-report-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  collections(query: CollectionsReportQueryDto) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const range = collectionsReportRange(query, now);

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
