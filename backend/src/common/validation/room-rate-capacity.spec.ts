
import {
  BadRequestException,
} from '@nestjs/common';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  MAX_RATE_CENTAVOS,
  MAX_ROOM_CAPACITY,
  RoomRateCapacityService,
} from './room-rate-capacity.service.js';

describe('Phase 4 Step 5 — Rate and Capacity', () => {
  const validator = new RoomRateCapacityService();

  it('accepts a valid integer rate', () => {
    expect(
      validator.validateBaseRate(250000),
    ).toBe(250000);
  });

  it('rejects zero, negative and decimal rates', () => {
    for (const value of [0, -100, 1.5]) {
      expect(() =>
        validator.validateBaseRate(value),
      ).toThrow(BadRequestException);
    }
  });

  it('rejects non-finite and oversized rates', () => {
    for (const value of [
      NaN,
      Infinity,
      MAX_RATE_CENTAVOS + 1,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        validator.validateBaseRate(value),
      ).toThrow(BadRequestException);
    }
  });

  it('accepts valid capacity', () => {
    expect(validator.validateCapacity(4)).toBe(4);
  });

  it('rejects invalid capacity', () => {
    for (const value of [
      0,
      -1,
      2.5,
      NaN,
      MAX_ROOM_CAPACITY + 1,
    ]) {
      expect(() =>
        validator.validateCapacity(value),
      ).toThrow(BadRequestException);
    }
  });

  it('accepts guests within capacity', () => {
    expect(() =>
      validator.validateGuestCount(2, 2),
    ).not.toThrow();
  });

  it('rejects guest count exceeding capacity', () => {
    expect(() =>
      validator.validateGuestCount(3, 2),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid guest counts', () => {
    for (const value of [0, -1, 1.5, NaN]) {
      expect(() =>
        validator.validateGuestCount(value, 4),
      ).toThrow(BadRequestException);
    }
  });

  it('validates a room type', () => {
    expect(() =>
      validator.validateRoomType({
        capacity: 2,
        baseRateCentavos: 250000,
      }),
    ).not.toThrow();
  });

  it('rejects invalid values in a room type', () => {
    expect(() =>
      validator.validateRoomType({
        capacity: 0,
        baseRateCentavos: 250000,
      }),
    ).toThrow(BadRequestException);
  });
});
