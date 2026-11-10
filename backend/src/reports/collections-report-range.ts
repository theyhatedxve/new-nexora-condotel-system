import { BadRequestException } from '@nestjs/common';
import { parsePhilippineDate } from '../common/validation/philippine-date-range.js';
import { dashboardPeriod } from '../dashboard/dashboard-metrics.js';

import type { CollectionsReportQueryDto } from './dto/collections-report-query.dto.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

export function collectionsReportRange(
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
