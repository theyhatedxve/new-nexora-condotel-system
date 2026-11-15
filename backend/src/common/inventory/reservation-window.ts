import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';

const PHILIPPINE_OFFSET_MS = 8 * 60 * 60_000;
export const INVENTORY_WINDOW_SELECT = {
  inventoryStartAt: true,
  inventoryEndAt: true,
} as const;

export type TimeWindow = { start: Date; end: Date };
type BookingWindow = {
  checkInDate: Date;
  checkOutDate: Date;
  inventoryStartAt?: Date | null;
  inventoryEndAt?: Date | null;
};

// Legacy values are calendar labels, not UTC arrival/departure times.
export function calendarInstant(marker: Date): Date {
  return new Date(marker.getTime() - PHILIPPINE_OFFSET_MS);
}

export function calendarMarker(instant: Date): Date {
  const local = new Date(instant.getTime() + PHILIPPINE_OFFSET_MS);
  return new Date(local.toISOString().slice(0, 10) + 'T00:00:00.000Z');
}

export function assertTimeWindow(window: TimeWindow): TimeWindow {
  if (
    !Number.isFinite(window.start.getTime()) ||
    !Number.isFinite(window.end.getTime()) ||
    window.start >= window.end
  ) throw new ConflictException('Invalid inventory interval. Staff review is required.');
  return window;
}

export function reservationWindow(row: BookingWindow): TimeWindow {
  if (row.inventoryStartAt != null || row.inventoryEndAt != null) {
    if (!row.inventoryStartAt || !row.inventoryEndAt) {
      throw new ConflictException('Incomplete reservation timing. Staff review is required.');
    }
    return assertTimeWindow({ start: row.inventoryStartAt, end: row.inventoryEndAt });
  }
  return assertTimeWindow({
    start: calendarInstant(row.checkInDate),
    end: calendarInstant(row.checkOutDate),
  });
}

export function blockWindow(block: { startDate: Date; endDate: Date }) {
  return {
    startDate: calendarInstant(block.startDate),
    endDate: calendarInstant(block.endDate),
  };
}

export function reservationOverlapWhere(
  start: Date, end: Date,
): Prisma.ReservationWhereInput {
  assertTimeWindow({ start, end });
  return {
    OR: [
      { inventoryStartAt: { lt: end }, inventoryEndAt: { gt: start } },
      {
        inventoryStartAt: null,
        inventoryEndAt: null,
        checkInDate: { lt: new Date(end.getTime() + PHILIPPINE_OFFSET_MS) },
        checkOutDate: { gt: new Date(start.getTime() + PHILIPPINE_OFFSET_MS) },
      },
    ],
  };
}

export function remainingReservationWhere(now = new Date()): Prisma.ReservationWhereInput {
  return {
    OR: [
      { inventoryEndAt: { gt: now } },
      {
        inventoryStartAt: null,
        inventoryEndAt: null,
        checkOutDate: { gt: calendarMarker(now) },
      },
    ],
  };
}

export function stayHasEnded(
  row: { checkOutDate: Date; inventoryEndAt?: Date | null },
  now = new Date(),
): boolean {
  return row.inventoryEndAt != null
    ? row.inventoryEndAt <= now
    : row.checkOutDate <= calendarMarker(now);
}
