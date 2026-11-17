import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { collectionsReportRange } from './collections-report-range.js';
import type { DepositReportQueryDto } from './dto/deposit-report-query.dto.js';

const REPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

@Injectable()
export class DepositReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async read(query: DepositReportQueryDto, actor: AuthenticatedUser | undefined) {
    if (!actor?.id) throw new UnauthorizedException('Sign in with a staff account.');
    if (!REPORT_ROLES.includes(actor.role)) throw new ForbiddenException('Report permission is required.');
    const page = query.page ?? 1;
    const limit = 20;
    if (!Number.isInteger(page) || page < 1 || page > 10000) {
      throw new BadRequestException('Invalid report page.');
    }
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.user.findUnique({
        where: { id: actor.id }, select: { status: true, role: { select: { name: true } } },
      });
      if (!staff || staff.status !== 'ACTIVE' || staff.role.name !== actor.role ||
          !REPORT_ROLES.includes(staff.role.name)) {
        throw new ForbiddenException('Current report permission is required.');
      }
      const now = new Date();
      const range = collectionsReportRange(query, now);
      const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
      if (properties.length !== 1) {
        throw new InternalServerErrorException('Exactly one property must be configured.');
      }
      const where = {
        reservation: { roomType: { propertyId: properties[0].id } },
        createdAt: { gte: range.start, lt: range.end, lte: now },
      } satisfies Prisma.DepositMovementWhereInput;
      const groups = await tx.depositMovement.groupBy({ by: ['kind'], where, _sum: { amountCentavos: true } });
      const totals = { COLLECT: 0, DEDUCT: 0, RESTORE: 0, RETURN: 0 };
      for (const group of groups) {
        const amount = group._sum.amountCentavos ?? 0;
        if (!Number.isSafeInteger(amount) || amount < 0) {
          throw new ConflictException('Deposit report requires review.');
        }
        totals[group.kind] = amount;
      }
      const total = await tx.depositMovement.count({ where });
      const rows = await tx.depositMovement.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true, kind: true, amountCentavos: true, createdAt: true,
          reservation: { select: { id: true, reservationNumber: true } },
        },
      });
      return {
        from: range.from, to: range.to, days: range.days, asOf: now.toISOString(),
        timezone: 'Asia/Manila' as const, currency: 'PHP' as const,
        totals, total, page, limit,
        items: rows.map((row) => ({
          id: row.id, kind: row.kind, amountCentavos: row.amountCentavos, createdAt: row.createdAt,
          reservationId: row.reservation.id, reservationNumber: row.reservation.reservationNumber,
        })),
      };
    });
  }
}
