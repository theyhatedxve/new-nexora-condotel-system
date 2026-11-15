import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  calculateRentalQuote,
  type RentalQuoteInput,
} from './rental-pricing.policy.js';

const now = new Date('2029-12-31T00:00:00.000Z');
const room = { capacity: 3, includedOccupancy: 2 };
const rate = { rateCentavos: 300_000, extraPersonFeeCentavos: 50_000 };
const input: RentalQuoteInput = {
  rentalType: 'NIGHTLY',
  units: 2,
  arrivalDate: '2030-01-01',
  arrivalTime: '15:00',
  guests: 3,
};

describe('rental quote policy', () => {
  it('prices a two-night Deluxe stay with one extra occupant at PHP 7,000', () => {
    const quote = calculateRentalQuote(input, room, rate, now);
    expect(quote.accommodationCentavos).toBe(600_000);
    expect(quote.extraPersonTotalCentavos).toBe(100_000);
    expect(quote.totalAmountCentavos).toBe(700_000);
    expect(quote.scheduledArrivalAt).toBe('2030-01-01T07:00:00.000Z');
    expect(quote.scheduledDepartureAt).toBe('2030-01-03T07:00:00.000Z');
    expect(quote.inventoryChecked).toBe(false);
  });

  it.each([
    ['WEEKLY', '2030-01-08T07:00:00.000Z'],
    ['MONTHLY', '2030-01-31T07:00:00.000Z'],
  ] as const)('uses exact duration for %s', (rentalType, departure) => {
    expect(calculateRentalQuote(
      { ...input, rentalType, units: 1 }, room, rate, now,
    ).scheduledDepartureAt).toBe(departure);
  });

  it('prices hourly surcharges per purchased hour', () => {
    const quote = calculateRentalQuote(
      { ...input, rentalType: 'HOURLY', units: 3 },
      room,
      { rateCentavos: 45_000, extraPersonFeeCentavos: 10_000 },
      now,
    );
    expect(quote.totalAmountCentavos).toBe(165_000);
  });

  it('allows hourly departure exactly at 11 PM but rejects later departure', () => {
    expect(calculateRentalQuote(
      { ...input, rentalType: 'HOURLY', units: 8 }, room, rate, now,
    ).scheduledDepartureAt).toBe('2030-01-01T15:00:00.000Z');
    expect(() => calculateRentalQuote(
      { ...input, rentalType: 'HOURLY', units: 8, arrivalTime: '15:01' },
      room, rate, now,
    )).toThrow(BadRequestException);
  });

  it.each([
    { guests: 4 },
    { units: 0 },
    { units: 1.5 },
    { arrivalDate: '2030-02-30' },
    { arrivalTime: '14:59' },
    { rentalType: 'MONTHLY' as const, units: 2 },
  ])('rejects invalid input %j', (change) => {
    expect(() => calculateRentalQuote(
      { ...input, ...change }, room, rate, now,
    )).toThrow(BadRequestException);
  });

  it('uses capacity when legacy included occupancy is absent', () => {
    expect(calculateRentalQuote(
      input, { capacity: 3, includedOccupancy: null }, rate, now,
    ).extraPersonTotalCentavos).toBe(0);
  });

  it('rejects integer-centavo overflow', () => {
    expect(() => calculateRentalQuote(
      input, room,
      { rateCentavos: 2_147_483_647, extraPersonFeeCentavos: 0 },
      now,
    )).toThrow(BadRequestException);
  });
});
