
import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

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

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';

import { AmenitiesService } from './amenities.service.js';

const testDb = resolve(process.cwd(), 'phase4.step3.test.db');
const devDb = resolve(process.cwd(), 'dev.db');

const suffix = randomUUID();

let prisma: PrismaClient;
let service: AmenitiesService;

let propertyId = '';
let firstTypeId = '';
let secondTypeId = '';
let amenityId = '';

const createdAmenityIds: string[] = [];

function checkIsolation(): void {
  if (process.cwd().split(/[\\/]/).at(-1) !== 'backend') {
    throw new Error('Run tests from backend/.');
  }

  if (!existsSync(testDb)) {
    throw new Error(
      'Missing phase4.step3.test.db. Run migrations first.',
    );
  }

  if (
    existsSync(devDb) &&
    realpathSync(testDb) === realpathSync(devDb)
  ) {
    throw new Error('Refusing to use backend/dev.db.');
  }
}

describe('Phase 4 Step 3 — AmenitiesService', () => {
  beforeAll(async () => {
    checkIsolation();

    const adapter = new PrismaBetterSqlite3({
      url: 'file:./phase4.step3.test.db',
    });

    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

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
      await prisma.$disconnect();
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
