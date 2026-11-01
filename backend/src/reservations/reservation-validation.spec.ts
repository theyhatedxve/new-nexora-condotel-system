
import 'reflect-metadata';

import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from
  '../prisma/prisma.service.js';

import { RoomRateCapacityService } from
  '../common/validation/room-rate-capacity.service.js';

import { todayInPhilippines } from
  '../common/validation/philippine-date-range.js';

import { CreateReservationDto } from
  './dto/create-reservation.dto.js';

import { ReservationValidationService } from
  './reservation-validation.service.js';

const DAY_MS = 86_400_000;

function dateAfterToday(days: number): string {
  const date = new Date(
    todayInPhilippines().getTime() + days * DAY_MS,
  );

  return date.toISOString().slice(0, 10);
}

function validInput() {
  return {
    roomTypeId: 'room-type-1',
    checkIn: dateAfterToday(2),
    checkOut: dateAfterToday(5),
    guests: 2,
    firstName: 'Test',
    lastName: 'Guest',
    email: 'guest@example.test',
  };
}

function createFixture() {
  const findProperties = vi.fn().mockResolvedValue([
    { id: 'property-1' },
  ]);

  const findRoomType = vi.fn().mockResolvedValue({
    id: 'room-type-1',
    capacity: 4,
    baseRateCentavos: 250_000,
  });

  // Only read operations are available to the service.
  const prismaMock = {
    property: { findMany: findProperties },
    roomType: { findFirst: findRoomType },
  } as unknown as PrismaService;

  const service = new ReservationValidationService(
    prismaMock,
    new RoomRateCapacityService(),
  );

  return {
    service,
    findProperties,
    findRoomType,
  };
}

describe('Phase 6 Step 2 — Reservation validation', () => {
  it('accepts a valid stay and guest count', async () => {
    const { service } = createFixture();

    const result = await service.validate(validInput());

    expect(result.roomTypeId).toBe('room-type-1');
    expect(result.propertyId).toBe('property-1');
    expect(result.guestCount).toBe(2);
    expect(result.nights).toBe(3);
    expect(result.checkInDate).toBeInstanceOf(Date);
    expect(result.checkOutDate).toBeInstanceOf(Date);
  });

  it('rejects a past check-in', async () => {
    const { service, findProperties } = createFixture();

    await expect(
      service.validate({
        ...validInput(),
        checkIn: dateAfterToday(-1),
      }),
    ).rejects.toThrow(BadRequestException);

    expect(findProperties).not.toHaveBeenCalled();
  });

  it('rejects checkout on or before check-in', async () => {
    const { service } = createFixture();

    await expect(
      service.validate({
        ...validInput(),
        checkOut: dateAfterToday(2),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid calendar dates', async () => {
    const { service } = createFixture();

    await expect(
      service.validate({
        ...validInput(),
        checkIn: '2026-02-30',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects stays longer than 30 nights', async () => {
    const { service } = createFixture();

    await expect(
      service.validate({
        ...validInput(),
        checkOut: dateAfterToday(33),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a stay of exactly 30 nights', async () => {
    const { service } = createFixture();

    const result = await service.validate({
      ...validInput(),
      checkOut: dateAfterToday(32),
    });

    expect(result.nights).toBe(30);
  });

  it('rejects invalid guest counts', async () => {
    const { service } = createFixture();

    for (const guests of [0, -1, 1.5, 2_147_483_648]) {
      await expect(
        service.validate({
          ...validInput(),
          guests,
        }),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('rejects guests above room capacity', async () => {
    const { service } = createFixture();

    await expect(
      service.validate({
        ...validInput(),
        guests: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an empty room-type identifier', async () => {
    const { service, findRoomType } = createFixture();

    await expect(
      service.validate({
        ...validInput(),
        roomTypeId: '   ',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(findRoomType).not.toHaveBeenCalled();
  });

  it('rejects a missing or inactive room type', async () => {
    const { service, findRoomType } = createFixture();

    findRoomType.mockResolvedValue(null);

    await expect(
      service.validate(validInput()),
    ).rejects.toThrow(NotFoundException);
  });

  it('requires exactly one configured property', async () => {
    const { service, findProperties } = createFixture();

    findProperties.mockResolvedValue([]);

    await expect(
      service.validate(validInput()),
    ).rejects.toThrow(InternalServerErrorException);

    findProperties.mockResolvedValue([
      { id: 'property-1' },
      { id: 'property-2' },
    ]);

    await expect(
      service.validate(validInput()),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('queries only the active type at the property', async () => {
    const { service, findRoomType } = createFixture();

    await service.validate(validInput());

    expect(findRoomType).toHaveBeenCalledWith({
      where: {
        id: 'room-type-1',
        propertyId: 'property-1',
        isActive: true,
      },
      select: {
        id: true,
        capacity: true,
        baseRateCentavos: true,
      },
    });
  });
});

describe('Reservation DTO validation', () => {
  function validateBody(body: Record<string, unknown>) {
    const dto = plainToInstance(
      CreateReservationDto,
      body,
    );

    return validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
  }

  it('accepts valid accountless guest details', () => {
    expect(validateBody(validInput())).toHaveLength(0);
  });

  it('rejects invalid names and email', () => {
    const errors = validateBody({
      ...validInput(),
      firstName: '',
      lastName: '',
      email: 'not-an-email',
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects client-supplied price and status', () => {
    const errors = validateBody({
      ...validInput(),
      totalAmountCentavos: 1,
      status: 'CONFIRMED',
      holdExpiresAt: new Date().toISOString(),
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'totalAmountCentavos',
        'status',
        'holdExpiresAt',
      ]),
    );
  });

  it('rejects unexpected guest-count types', () => {
    const errors = validateBody({
      ...validInput(),
      guests: 'two',
    });

    expect(
      errors.some((error) => error.property === 'guests'),
    ).toBe(true);
  });
});
