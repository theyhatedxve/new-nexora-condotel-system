import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import {
  parsePhilippineDate,
} from '../common/validation/philippine-date-range.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import type {
  AuditListQueryDto,
} from './dto/audit-list-query.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private filters(
    query: AuditListQueryDto,
  ): Prisma.AuditLogWhereInput {
    if (
      (query.from === undefined) !==
      (query.to === undefined)
    ) {
      throw new BadRequestException(
        'Provide both from and to dates.',
      );
    }

    const where: Prisma.AuditLogWhereInput = {};

    if (
      query.from !== undefined &&
      query.to !== undefined
    ) {
      const first = parsePhilippineDate(
        query.from,
      );

      const last = parsePhilippineDate(
        query.to,
      );

      if (first > last) {
        throw new BadRequestException(
          'From date must not be after To date.',
        );
      }

      const start = new Date(
        `${query.from}T00:00:00+08:00`,
      );

      const end = new Date(
        new Date(
          `${query.to}T00:00:00+08:00`,
        ).getTime() + DAY_MS,
      );

      where.createdAt = {
        gte: start,
        lt: end,
      };
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    return where;
  }

  list(query: AuditListQueryDto) {
    const where = this.filters(query);

    return this.prisma.$transaction(async (tx) => {
      const total = await tx.auditLog.count({
        where,
      });

      const totalPages = Math.ceil(
        total / query.limit,
      );

      const page =
        total === 0
          ? 1
          : Math.min(query.page, totalPages);

      const items = await tx.auditLog.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          createdAt: true,
          action: true,
          entityType: true,
          entityId: true,
          actorUserId: true,
        },
      });

      return {
        items,
        total,
        page,
        limit: query.limit,
        totalPages,
      };
    });
  }
}