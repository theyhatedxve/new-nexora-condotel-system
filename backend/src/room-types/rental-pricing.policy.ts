import { BadRequestException } from '@nestjs/common';
import type { RentalType } from '../generated/prisma/client.js';
import { parsePhilippineDate } from '../common/validation/philippine-date-range.js';
import { MAX_RATE_CENTAVOS } from '../common/validation/room-rate-capacity.service.js';

export const RENTAL_TYPES = ['HOURLY', 'NIGHTLY', 'WEEKLY', 'MONTHLY'] as const;
export const MAX_RENTAL_DAYS = 30;

export interface RentalQuoteInput {
  rentalType: RentalType;
  units: number;
  arrivalDate: string;
  arrivalTime: string;
  guests: number;
}

export function assertRentalRate(rate: {
  rateCentavos: number;
  extraPersonFeeCentavos: number;
}): void {
  if (
    !Number.isSafeInteger(rate.rateCentavos) ||
    rate.rateCentavos < 1 ||
    rate.rateCentavos > MAX_RATE_CENTAVOS ||
    !Number.isSafeInteger(rate.extraPersonFeeCentavos) ||
    rate.extraPersonFeeCentavos < 0 ||
    rate.extraPersonFeeCentavos > MAX_RATE_CENTAVOS
  ) {
    throw new BadRequestException('Invalid rental rate or extra-person fee.');
  }
}

export function rentalDurationMinutes(rentalType: RentalType, units: number): number {
  if (!RENTAL_TYPES.includes(rentalType) ||
      !Number.isSafeInteger(units) || units < 1 || units > 30) {
    throw new BadRequestException('Choose a supported rental type and 1 to 30 units.');
  }
  const unitMinutes = {
    HOURLY: 60,
    NIGHTLY: 24 * 60,
    WEEKLY: 7 * 24 * 60,
    MONTHLY: 30 * 24 * 60,
  }[rentalType];
  const durationMinutes = unitMinutes * units;
  if (durationMinutes > MAX_RENTAL_DAYS * 24 * 60) {
    throw new BadRequestException('This prototype supports stays up to 30 days.');
  }
  return durationMinutes;
}

export function calculateRentalQuote(
  input: RentalQuoteInput,
  room: { capacity: number; includedOccupancy: number | null },
  rate: { rateCentavos: number; extraPersonFeeCentavos: number },
  now = new Date(),
) {
  if (!RENTAL_TYPES.includes(input.rentalType)) {
    throw new BadRequestException('Choose a supported rental type.');
  }
  if (!Number.isSafeInteger(input.units) || input.units < 1 || input.units > 30) {
    throw new BadRequestException('Rental units must be between 1 and 30.');
  }

  parsePhilippineDate(input.arrivalDate);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.arrivalTime)) {
    throw new BadRequestException('Arrival time must use HH:mm.');
  }
  const [hours, minutes] = input.arrivalTime.split(':').map(Number);
  const arrivalMinutes = hours * 60 + minutes;
  if (arrivalMinutes < 15 * 60) {
    throw new BadRequestException('Scheduled arrival starts at 3 PM.');
  }

  const durationMinutes = rentalDurationMinutes(input.rentalType, input.units);
  if (
    input.rentalType === 'HOURLY' &&
    arrivalMinutes + durationMinutes > 23 * 60
  ) {
    throw new BadRequestException('Hourly stays must finish by 11 PM.');
  }

  const arrival = new Date(
    `${input.arrivalDate}T${input.arrivalTime}:00+08:00`,
  );
  if (arrival.getTime() <= now.getTime()) {
    throw new BadRequestException('Scheduled arrival must be in the future.');
  }

  const includedOccupancy = room.includedOccupancy ?? room.capacity;
  if (
    !Number.isSafeInteger(room.capacity) ||
    room.capacity < 1 ||
    !Number.isSafeInteger(includedOccupancy) ||
    includedOccupancy < 1 ||
    includedOccupancy > room.capacity ||
    !Number.isSafeInteger(input.guests) ||
    input.guests < 1 ||
    input.guests > room.capacity
  ) {
    throw new BadRequestException('Guest count exceeds the configured occupancy.');
  }

  assertRentalRate(rate);
  const extraGuests = Math.max(0, input.guests - includedOccupancy);
  const accommodationCentavos = rate.rateCentavos * input.units;
  const extraPersonTotalCentavos =
    rate.extraPersonFeeCentavos * extraGuests * input.units;
  const totalAmountCentavos = accommodationCentavos + extraPersonTotalCentavos;
  if (
    !Number.isSafeInteger(totalAmountCentavos) ||
    totalAmountCentavos > MAX_RATE_CENTAVOS
  ) {
    throw new BadRequestException('The quote exceeds the supported amount.');
  }

  return {
    currency: 'PHP' as const,
    rentalType: input.rentalType,
    units: input.units,
    scheduledArrivalAt: arrival.toISOString(),
    scheduledDepartureAt: new Date(
      arrival.getTime() + durationMinutes * 60_000,
    ).toISOString(),
    durationMinutes,
    guests: input.guests,
    includedOccupancy,
    maxOccupancy: room.capacity,
    extraGuests,
    rateCentavos: rate.rateCentavos,
    extraPersonFeeCentavos: rate.extraPersonFeeCentavos,
    accommodationCentavos,
    extraPersonTotalCentavos,
    totalAmountCentavos,
    quoteOnly: true,
    inventoryChecked: false,
  };
}
