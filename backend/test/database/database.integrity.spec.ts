
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  createIsolatedTestDatabase,
  type IsolatedTestDatabase,
} from '../helpers/isolated-database.js';


let prisma: PrismaClient;
let database: IsolatedTestDatabase | undefined;


describe('NEXORA database integrity', () => {
    beforeAll(async () => {
    database = await createIsolatedTestDatabase();
    prisma = database.prisma;

    await prisma.role.count();
    await prisma.property.count();
    await prisma.roomType.count();
  }, 60_000);

  afterAll(async () => {
    await database?.dispose();
  });

  it('connects to the migrated SQLite database', async () => {
  const result = await prisma.$queryRaw<
    Array<{ value: number | bigint }>
  >`SELECT 1 AS value`;

  expect(Number(result[0]?.value)).toBe(1);
  });

  it('rejects duplicate role names', async () => {
    const roleName = `STEP10_ROLE_${crypto.randomUUID()}`;

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.role.create({
          data: { name: roleName },
        });

        // The second insert must fail due to @unique.
        await tx.role.create({
          data: { name: roleName },
        });
      }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });

    // The transaction must leave no partial record.
    expect(
      await prisma.role.count({
        where: { name: roleName },
      }),
    ).toBe(0);
  });

  it('rejects invalid foreign-key references', async () => {
    const roomNumber = `STEP10_${crypto.randomUUID()}`;

    await expect(
      prisma.room.create({
        data: {
          roomNumber,
          roomTypeId: 'nonexistent-room-type',
          status: 'READY',
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  it('rejects missing required property fields', async () => {
    // Missing city and province are intentionally tested
    // using an explicitly invalid runtime payload.
    const invalidProperty = {
      name: 'Invalid Step 10 Property',
      address: 'Development Test Address',
    };

    await expect(
      prisma.property.create({
        data: invalidProperty as never,
      }),
    ).rejects.toThrow();
  });

  it('reads related property, rooms and amenities', async () => {
    const suffix = crypto.randomUUID();

    // Roll back intentionally to leave the test database
    // unchanged after this test.
    await expect(
      prisma.$transaction(async (tx) => {
        const property = await tx.property.create({
          data: {
            name: `STEP10_PROPERTY_${suffix}`,
            address: 'Test Address',
            city: 'Test City',
            province: 'Test Province',
          },
        });

        const roomType = await tx.roomType.create({
          data: {
            propertyId: property.id,
            name: 'Test Room Type',
            capacity: 2,
            baseRateCentavos: 200000,
          },
        });

        await tx.room.create({
          data: {
            roomNumber: `STEP10_ROOM_${suffix}`,
            roomTypeId: roomType.id,
            status: 'READY',
          },
        });

        const amenity = await tx.amenity.create({
          data: {
            name: `STEP10_AMENITY_${suffix}`,
          },
        });

        await tx.roomTypeAmenity.create({
          data: {
            roomTypeId: roomType.id,
            amenityId: amenity.id,
          },
        });

        const result = await tx.roomType.findUnique({
          where: { id: roomType.id },
          include: {
            property: true,
            rooms: true,
            amenities: {
              include: {
                amenity: true,
              },
            },
          },
        });

        expect(result?.property.id).toBe(property.id);
        expect(result?.rooms).toHaveLength(1);
        expect(result?.amenities).toHaveLength(1);
        expect(result?.amenities[0]?.amenity.id).toBe(
          amenity.id,
        );

        throw new Error('EXPECTED_TEST_ROLLBACK');
      }),
    ).rejects.toThrow('EXPECTED_TEST_ROLLBACK');

    expect(
      await prisma.property.count({
        where: { name: `STEP10_PROPERTY_${suffix}` },
      }),
    ).toBe(0);
  });

  it('persists a completed transaction', async () => {
    const roleName = `STEP10_PERSIST_${crypto.randomUUID()}`;

    const role = await prisma.role.create({
      data: { name: roleName },
    });

    try {
      const found = await prisma.role.findUnique({
        where: { id: role.id },
      });

      expect(found?.name).toBe(roleName);
    } finally {
      // Clean up only the test record created here.
      await prisma.role.delete({
        where: { id: role.id },
      });
    }
  });

    it('passes SQLite integrity and foreign-key checks', async () => {
    const settings = await prisma.$queryRaw<
      Array<{ foreign_keys: number | bigint }>
    >`PRAGMA foreign_keys`;

    expect(Number(settings[0]?.foreign_keys)).toBe(1);

    const integrity = await prisma.$queryRaw<
      Array<{ integrity_check: string }>
    >`PRAGMA integrity_check`;

    expect(integrity).toEqual([{ integrity_check: 'ok' }]);

    const violations = await prisma.$queryRaw<
      Array<{
        table: string;
        rowid: number | bigint | null;
        parent: string;
        fkid: number | bigint;
      }>
    >`PRAGMA foreign_key_check`;

    expect(violations).toEqual([]);
  });
});
