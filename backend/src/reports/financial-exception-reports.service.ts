import {
  BadRequestException, ForbiddenException, Injectable,
  InternalServerErrorException, UnauthorizedException,
} from '@nestjs/common';
import type { PaymentEventStatus, Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FINANCIAL_EXCEPTION_EVENT } from '../payments/reconciliation/financial-exceptions.js';
import { collectionsReportRange } from './collections-report-range.js';
import type { FinancialExceptionReportQueryDto } from './dto/financial-exception-report-query.dto.js';

const REASONS = [
  'CLOSED_BOOKING_CAPTURE', 'EXCESS_COLLECTION',
  'UNFULFILLED_CAPTURE', 'LEDGER_REVIEW_REQUIRED',
];

function noticeState(status: PaymentEventStatus) {
  if (status === 'FAILED') return 'OPEN' as const;
  if (status === 'PROCESSED') return 'RESOLVED' as const;
  return 'REVIEW' as const;
}

function recordedReason(errorMessage: string | null, payloadJson: string | null, reservationId: string) {
  if (errorMessage && REASONS.includes(errorMessage)) return errorMessage;
  try {
    const payload: unknown = JSON.parse(payloadJson ?? 'null');
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const data = payload as Record<string, unknown>;
      if (data.version === 1 && data.source === 'backend_financial_exception' &&
          data.reservationId === reservationId && typeof data.reason === 'string' && REASONS.includes(data.reason)) {
        return data.reason;
      }
    }
  } catch {
    // Historical or malformed payloads are displayed without raw contents.
  }
  return 'UNKNOWN';
}

@Injectable()
export class FinancialExceptionReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async read(query: FinancialExceptionReportQueryDto, actor: AuthenticatedUser | undefined) {
    if (!actor?.id) throw new UnauthorizedException('Sign in with a staff account.');
    if (actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super Admin permission is required.');
    const page = query.page ?? 1;
    const limit = 20;
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Invalid report page.');
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.user.findUnique({
        where: { id: actor.id }, select: { status: true, role: { select: { name: true } } },
      });
      if (!staff || staff.status !== 'ACTIVE' || staff.role.name !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Current Super Admin permission is required.');
      }
      const now = new Date();
      const range = collectionsReportRange(query, now);
      const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
      if (properties.length !== 1) throw new InternalServerErrorException('Exactly one property must be configured.');
      const where = {
        eventType: FINANCIAL_EXCEPTION_EVENT, signatureVerified: false,
        providerEventId: { startsWith: 'financial-exception:' },
        createdAt: { gte: range.start, lt: range.end, lte: now },
        payment: { is: {
          method: 'PAYMONGO', provider: 'PAYMONGO',
          reservation: { roomType: { propertyId: properties[0].id } },
        } },
      } satisfies Prisma.PaymentEventWhereInput;
      const groups = await tx.paymentEvent.groupBy({ by: ['status'], where, _count: { _all: true } });
      const counts = { OPEN: 0, RESOLVED: 0, REVIEW: 0 };
      for (const group of groups) counts[noticeState(group.status)] += group._count._all;
      const total = counts.OPEN + counts.RESOLVED + counts.REVIEW;
      const rows = await tx.paymentEvent.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true, status: true, errorMessage: true, payloadJson: true, createdAt: true, processedAt: true,
          payment: { select: { id: true, reservation: { select: { id: true, reservationNumber: true } } } },
        },
      });
      return {
        from: range.from, to: range.to, days: range.days, asOf: now.toISOString(),
        timezone: 'Asia/Manila' as const, counts, total, page, limit,
        items: rows.map((row) => {
          // The query requires an associated payment.
          if (!row.payment) throw new InternalServerErrorException('Financial notice association requires review.');
          const booking = row.payment.reservation;
          return {
            id: row.id, state: noticeState(row.status),
            reason: recordedReason(row.errorMessage, row.payloadJson, booking.id),
            createdAt: row.createdAt, lastUpdatedAt: row.processedAt,
            paymentId: row.payment.id, reservationId: booking.id, reservationNumber: booking.reservationNumber,
          };
        }),
      };
    });
  }
}
