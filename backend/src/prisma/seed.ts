
import 'dotenv/config';
import { PrismaService } from './prisma.service.js';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Development sample data only.
const PROPERTY_NAME = 'NEXORA Demo Condotel';

const roles = [
  { name: 'SUPER_ADMIN', description: 'System owner' },
  { name: 'ADMIN', description: 'System administrator' },
  { name: 'MANAGER', description: 'Property manager' },
  { name: 'RECEPTIONIST', description: 'Front desk staff' },
  { name: 'GUEST', description: 'Registered guest' },
];

const roomTypes = [
  {
    name: 'Standard Room',
    capacity: 2,
    baseRateCentavos: 200000,
    rooms: ['101', '102'],
    amenities: ['Wi-Fi', 'Air Conditioning'],
  },
  {
    name: 'Deluxe Room',
    capacity: 3,
    baseRateCentavos: 300000,
    rooms: ['201', '202'],
    amenities: ['Wi-Fi', 'Air Conditioning', 'Smart TV'],
  },
  {
    name: 'Family Suite',
    capacity: 4,
    baseRateCentavos: 450000,
    rooms: ['301', '302'],
    amenities: [
      'Wi-Fi',
      'Air Conditioning',
      'Smart TV',
      'Kitchenette',
    ],
  },
];

const amenityNames = [
  'Wi-Fi',
  'Air Conditioning',
  'Smart TV',
  'Kitchenette',
];

function assertDevelopmentSeedTarget(): void {
  if (process.env.NEXORA_ALLOW_DEV_SEED !== 'true') {
    throw new Error(
      'Set NEXORA_ALLOW_DEV_SEED=true to run the development seed.',
    );
  }

  // Works from src/prisma/ and the compiled dist/prisma/ location.
  const expectedDatabase = fileURLToPath(
    new URL('../../dev.db', import.meta.url),
  );

  const databaseSettings = [
    'DATABASE_URL',
    'NEXORA_RUNTIME_DATABASE_URL',
  ] as const;

  for (const setting of databaseSettings) {
    const value = process.env[setting];

    if (!value?.startsWith('file:')) {
      throw new Error(
        `${setting} must point to the existing backend/dev.db.`,
      );
    }

    const databasePath = value.slice(5);

    if (!isAbsolute(databasePath)) {
      throw new Error(
        `${setting} must use an absolute file: path.`,
      );
    }

    if (relative(expectedDatabase, resolve(databasePath)) !== '') {
      throw new Error(
        `${setting} must point to backend/dev.db. Seeding stopped.`,
      );
    }
  }

  if (!existsSync(expectedDatabase)) {
    throw new Error(
      'backend/dev.db was not found. Seeding stopped before connecting.',
    );
  }
}

async function seedDatabase(prisma: PrismaService): Promise<void> {
  console.log('Starting NEXORA development seed...');

  // 1. Roles: create missing roles without changing existing ones.
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log('System roles verified.');

  // 2. Single-property protection.
  const existingProperty = await prisma.property.findFirst();

  if (
    existingProperty &&
    existingProperty.name !== PROPERTY_NAME
  ) {
    throw new Error(
      'An existing property was found. Seeding stopped to protect it.',
    );
  }

  const property =
    existingProperty ??
    (await prisma.property.create({
      data: {
        name: PROPERTY_NAME,
        address: 'Development Sample Address',
        city: 'Demo City',
        province: 'Demo Province',
        country: 'Philippines',
        description: 'Development test property only.',
      },
    }));

  console.log('Demo property verified.');

  // 3. Amenities: create missing amenities.
  const amenityIds = new Map<string, string>();

  for (const name of amenityNames) {
    const amenity = await prisma.amenity.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    amenityIds.set(name, amenity.id);
  }

  console.log('Amenities verified.');

  // 4. Room types, rooms, and their amenity relationships.
  for (const data of roomTypes) {
    const roomType = await prisma.roomType.upsert({
      where: {
        propertyId_name: {
          propertyId: property.id,
          name: data.name,
        },
      },
      update: {},
      create: {
        propertyId: property.id,
        name: data.name,
        capacity: data.capacity,
        baseRateCentavos: data.baseRateCentavos,
      },
    });

    for (const roomNumber of data.rooms) {
      const existingRoom = await prisma.room.findUnique({
        where: { roomNumber },
      });

      if (
        existingRoom &&
        existingRoom.roomTypeId !== roomType.id
      ) {
        throw new Error(
          `Room ${roomNumber} already belongs to another room type.`,
        );
      }

      if (!existingRoom) {
        await prisma.room.create({
          data: {
            roomNumber,
            roomTypeId: roomType.id,
            status: 'READY',
          },
        });
      }
    }

    for (const amenityName of data.amenities) {
      const amenityId = amenityIds.get(amenityName);

      if (!amenityId) {
        throw new Error(
          `Amenity not found: ${amenityName}`,
        );
      }

      await prisma.roomTypeAmenity.upsert({
        where: {
          roomTypeId_amenityId: {
            roomTypeId: roomType.id,
            amenityId,
          },
        },
        update: {},
        create: {
          roomTypeId: roomType.id,
          amenityId,
        },
      });
    }
  }

  console.log('Room types, rooms, and amenities verified.');
  console.log('NEXORA development seed completed successfully.');
}

async function main(): Promise<void> {
  assertDevelopmentSeedTarget();

  const prisma = new PrismaService();

  try {
    await prisma.$connect();
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('NEXORA seed failed:', error);
  process.exitCode = 1;
});
