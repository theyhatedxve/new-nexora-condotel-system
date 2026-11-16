import { BadRequestException, ConflictException } from '@nestjs/common';
import type { RentalType, Reservation } from '../generated/prisma/client.js';
import { calculateRentalQuote, rentalDurationMinutes } from '../room-types/rental-pricing.policy.js';
import { calendarMarker } from '../common/inventory/reservation-window.js';

export const RENTAL_RESERVATION_SELECT = {
  rentalType: true,
  rentalUnits: true,
  rentalRateCentavos: true,
  includedOccupancy: true,
  extraPersonFeeCentavos: true,
  accommodationCentavos: true,
  extraPersonTotalCentavos: true,
  scheduledArrivalAt: true,
  scheduledDepartureAt: true,
  inventoryStartAt: true,
  inventoryEndAt: true,
  actualArrivalAt: true,
  actualDepartureAt: true,
} as const;

type RentalRequest = {
  rentalType?: RentalType;
  rentalUnits?: number;
  arrivalTime?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

type PricedCategory = {
  capacity: number;
  includedOccupancy: number | null;
  baseRateCentavos: number;
  rentalRates: {
    rentalType: RentalType;
    isActive: boolean;
    rateCentavos: number;
    extraPersonFeeCentavos: number;
  }[];
};

export function reservationRentalQuote(
  input: RentalRequest, room: PricedCategory, now = new Date(),
) {
  if (input.rentalType === undefined && input.rentalUnits === undefined) return null;
  if (!input.rentalType || !input.arrivalTime || input.rentalUnits === undefined) {
    throw new BadRequestException('Rental type, units and arrival time are required together.');
  }
  const configured = room.rentalRates.find((rate) => rate.rentalType === input.rentalType);
  const rate = configured ?? (input.rentalType === 'NIGHTLY' ? {
    rateCentavos: room.baseRateCentavos, extraPersonFeeCentavos: 0, isActive: true,
  } : null);
  if (!rate?.isActive) throw new BadRequestException('This rental type is unavailable.');
  const quote = calculateRentalQuote({
    rentalType: input.rentalType,
    units: input.rentalUnits,
    arrivalDate: input.checkIn,
    arrivalTime: input.arrivalTime,
    guests: input.guests,
  }, room, rate, now);
  if (calendarMarker(new Date(quote.scheduledDepartureAt)).toISOString().slice(0, 10) !== input.checkOut) {
    throw new BadRequestException('Check-out date must match the selected rental duration.');
  }
  return quote;
}

export function rentalReservationSnapshot(
  quote: NonNullable<ReturnType<typeof reservationRentalQuote>>,
) {
  const scheduledArrivalAt = new Date(quote.scheduledArrivalAt);
  const scheduledDepartureAt = new Date(quote.scheduledDepartureAt);
  return {
    rentalType: quote.rentalType,
    rentalUnits: quote.units,
    rentalRateCentavos: quote.rateCentavos,
    includedOccupancy: quote.includedOccupancy,
    extraPersonFeeCentavos: quote.extraPersonFeeCentavos,
    accommodationCentavos: quote.accommodationCentavos,
    extraPersonTotalCentavos: quote.extraPersonTotalCentavos,
    scheduledArrivalAt,
    scheduledDepartureAt,
    inventoryStartAt: scheduledArrivalAt,
    inventoryEndAt: scheduledDepartureAt,
  };
}

type RentalTiming = Pick<Reservation,
  'rentalType' | 'rentalUnits' | 'scheduledArrivalAt' | 'scheduledDepartureAt'
>;

export function actualRentalWindow(booking: RentalTiming, now: Date, preserveLateDeparture = false) {
  if (!booking.rentalType || booking.rentalUnits == null ||
      !booking.scheduledArrivalAt || !booking.scheduledDepartureAt) {
    throw new ConflictException('Rental timing is incomplete. Staff review is required.');
  }
  if (
    !Number.isFinite(now.getTime()) ||
    now.getTime() < booking.scheduledArrivalAt.getTime() - 30 * 60_000 ||
    now >= booking.scheduledDepartureAt
  ) throw new ConflictException('Check-in is outside the permitted arrival window.');
  const end = preserveLateDeparture && now > booking.scheduledArrivalAt
    ? new Date(booking.scheduledDepartureAt.getTime())
    : new Date(now.getTime() + rentalDurationMinutes(
    booking.rentalType, booking.rentalUnits,
  ) * 60_000);
  if (booking.rentalType === 'HOURLY') {
    const closing = new Date(calendarMarker(now).getTime() + 15 * 60 * 60_000);
    if (end > closing) throw new ConflictException('Hourly stays must finish by 11 PM.');
  }
  return { start: now, end };
}
