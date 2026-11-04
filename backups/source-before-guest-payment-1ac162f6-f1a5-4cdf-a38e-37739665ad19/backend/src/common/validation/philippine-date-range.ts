
import { BadRequestException } from '@nestjs/common';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parsePhilippineDate(value: string): Date {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new BadRequestException(
      'Date must use YYYY-MM-DD format.',
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(
      'Invalid Philippine calendar date.',
    );
  }

  return date;
}

export function parseBlockRange(
  start: string,
  end: string,
): { startDate: Date; endDate: Date } {
  const startDate = parsePhilippineDate(start);
  const endDate = parsePhilippineDate(end);

  if (startDate >= endDate) {
    throw new BadRequestException(
      'Block end date must be after its start date.',
    );
  }

  return { startDate, endDate };
}


export function todayInPhilippines(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());

  const getPart = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const dateText = [
    getPart('year'),
    getPart('month'),
    getPart('day'),
  ].join('-');

  return parsePhilippineDate(dateText);
}

