
import { randomUUID } from 'node:crypto';

import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import type { PrismaClient } from '../generated/prisma/client.js';

import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../../test/helpers/isolated-database.js';

import { AmenitiesService } from './amenities.service.js';

const suffix = randomUUID();

let prisma: PrismaClient;
let isolatedDatabase: IsolatedTestDatabase | undefined;
let service: AmenitiesService;

let propertyId = '';
let firstTypeId = '';
let secondTypeId = '';
let amenityId = '';

const createdAmenityIds: string[] = [];

describe('Phase 4 Step 3 — AmenitiesService', () => {
  beforeAll(async () => {
    isolatedDatabase = await createIsolatedTestDatabase();
    prisma = isolatedDatabase.prisma;

    const property = await prisma.property.create({
      data: {
        name: `Step 3 Property ${suffix}`,
        address: 'Test Street',
        city: 'Test City',
        province: 'Test Province',
      },
    });

    propertyId = property.id;

    const firstType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Deluxe ${suffix}`,
        capacity: 2,
        baseRateCentavos: 250000,
      },
    });

    const secondType = await prisma.roomType.create({
      data: {
        propertyId,
        name: `Family ${suffix}`,
        capacity: 4,
        baseRateCentavos: 350000,
      },
    });

    firstTypeId = firstType.id;
    secondTypeId = secondType.id;

    service = new AmenitiesService(prisma as never);
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      if (createdAmenityIds.length > 0) {
        await prisma.roomTypeAmenity.deleteMany({
          where: {
            amenityId: { in: createdAmenityIds },
          },
        });

        await prisma.amenity.deleteMany({
          where: {
            id: { in: createdAmenityIds },
          },
        });
      }

      if (propertyId) {
        await prisma.roomType.deleteMany({
          where: { propertyId },
        });

        await prisma.property.delete({
          where: { id: propertyId },
        });
      }
    } finally {
      await isolatedDatabase?.dispose();
    }
  });

  it('creates and lists an amenity', async () => {
    const created = await service.create({
      name: `Wi-Fi ${suffix}`,
      description: 'Wireless internet',
    });

    amenityId = created.id;
    createdAmenityIds.push(created.id);

    const all = await service.findAll();

    expect(all.some((a) => a.id === amenityId)).toBe(true);
    expect(created.description).toBe('Wireless internet');
    expect(created).not.toHaveProperty('createdAt');
  });

  it('rejects case-insensitive duplicate names', async () => {
    await expect(
      service.create({
        name: `wi-fi ${suffix}`.toUpperCase(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects names containing only whitespace', async () => {
    await expect(
      service.create({ name: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates amenity information', async () => {
    const updated = await service.update(amenityId, {
      description: 'Fast wireless internet',
    });

    expect(updated.description).toBe('Fast wireless internet');
  });

  it('rejects an unknown amenity', async () => {
    await expect(
      service.update('missing-id', { name: 'Unknown' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('attaches an amenity to a room type', async () => {
    const attached = await service.attach(
      firstTypeId,
      amenityId,
    );

    expect(attached.id).toBe(amenityId);

    const amenities =
      await service.findRoomTypeAmenities(firstTypeId);

    expect(amenities).toHaveLength(1);
    expect(amenities[0].id).toBe(amenityId);
  });

  it('rejects duplicate associations', async () => {
    await expect(
      service.attach(firstTypeId, amenityId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects nonexistent amenities and room types', async () => {
    await expect(
      service.attach(firstTypeId, 'missing-amenity'),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.attach('missing-room-type', amenityId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('preserves a shared amenity when one link is detached', async () => {
    await service.attach(secondTypeId, amenityId);

    await service.detach(firstTypeId, amenityId);

    const first = await service.findRoomTypeAmenities(
      firstTypeId,
    );

    const second = await service.findRoomTypeAmenities(
      secondTypeId,
    );

    expect(first).toHaveLength(0);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(amenityId);

    const amenity = await prisma.amenity.findUnique({
      where: { id: amenityId },
    });

    expect(amenity).not.toBeNull();
  });

  it('rejects detaching a nonexistent association', async () => {
    await expect(
      service.detach(firstTypeId, amenityId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
