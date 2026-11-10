import { auditFilters } from './audit-filters.js';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { AuditListQueryDto } from './dto/audit-list-query.dto.js';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  list(query: AuditListQueryDto) {
    const where = auditFilters(query);

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
