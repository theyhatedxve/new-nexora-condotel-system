import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { parsePhilippineDate } from '../common/validation/philippine-date-range.js';

import type { AuditListQueryDto } from './dto/audit-list-query.dto.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

export function auditFilters(
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
