import 'reflect-metadata';
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaService } from './prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import {
  activeGuestPhoneKeyId,
  encryptGuestPhone,
} from '../common/security/guest-phone.crypto.js';
import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';
import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';
import {
  calendarMarker,
} from '../common/inventory/reservation-window.js';
import {
  RENTAL_TYPES,
  rentalDurationMinutes,
} from '../room-types/rental-pricing.policy.js';
import {
  ReservationValidationService,
} from '../reservations/reservation-validation.service.js';
import {
  ReservationAcquisitionService,
} from '../reservations/reservation-acquisition.service.js';
import {
  initialGuestBookingTiming,
} from '../reservations/policies/guest-booking-policy.js';
import {
  HOLD_DURATION_MS,
} from '../reservations/policies/reservation-acquisition-policy.js';

import type {
  RentalType,
} from '../generated/prisma/client.js';
import type {
  CreateReservationDto,
} from '../reservations/dto/create-reservation.dto.js';

const DEMO_PASSWORD = 'NexoraDemo!2026';

const DEMO_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'GUEST',
] as const;

const DEMO_ACCOUNTS = [
  {
    firstName: 'Demo',
    lastName: 'Super Admin',
    email: 'superadmin@nexora.example',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  },
  {
    firstName: 'Demo',
    lastName: 'Admin',
    email: 'admin@nexora.example',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    firstName: 'Demo',
    lastName: 'Manager',
    email: 'manager@nexora.example',
    role: 'MANAGER',
    status: 'ACTIVE',
  },
  {
    firstName: 'Demo',
    lastName: 'Receptionist',
    email: 'reception@nexora.example',
    role: 'RECEPTIONIST',
    status: 'ACTIVE',
  },
  {
    firstName: 'Demo',
    lastName: 'Guest',
    email: 'guest@nexora.example',
    role: 'GUEST',
    status: 'ACTIVE',
  },
  {
    firstName: 'Demo',
    lastName: 'New Guest',
    email: 'newguest@nexora.example',
    role: 'GUEST',
    status: 'ACTIVE',
  },
  {
    firstName: 'Demo',
    lastName: 'Pending Guest',
    email: 'pending@nexora.example',
    role: 'GUEST',
    status: 'PENDING',
  },
  {
    firstName: 'Demo',
    lastName: 'Disabled Guest',
    email: 'disabled@nexora.example',
    role: 'GUEST',
    status: 'DISABLED',
  },
] as const;

const DEMO_CATEGORIES = [
  {
    name: 'Deluxe Room',
    capacity: 3,
    includedOccupancy: 2,
    rooms: ['101', '102', '103'],
    rates: {
      HOURLY: 50_000,
      NIGHTLY: 450_000,
      WEEKLY: 2_800_000,
      MONTHLY: 9_000_000,
    },
  },
  {
    name: 'Executive Room',
    capacity: 3,
    includedOccupancy: 2,
    rooms: ['201', '202', '203'],
    rates: {
      HOURLY: 65_000,
      NIGHTLY: 580_000,
      WEEKLY: 3_500_000,
      MONTHLY: 11_500_000,
    },
  },
  {
    name: 'Suite',
    capacity: 4,
    includedOccupancy: 2,
    rooms: ['301', '302', '303'],
    rates: {
      HOURLY: 85_000,
      NIGHTLY: 750_000,
      WEEKLY: 4_500_000,
      MONTHLY: 15_000_000,
    },
  },
] as const;

const EXTRA_PERSON_FEES: Record<RentalType, number> = {
  HOURLY: 10_000,
  NIGHTLY: 50_000,
  WEEKLY: 250_000,
  MONTHLY: 800_000,
};

const DEMO_BOOKINGS: {
  category: string;
  rentalType: RentalType;
  units: number;
  guests: number;
  arrivalOffsetDays: number;
}[] = [
  {
    category: 'Deluxe Room',
    rentalType: 'HOURLY',
    units: 3,
    guests: 2,
    arrivalOffsetDays: 2,
  },
  {
    category: 'Executive Room',
    rentalType: 'NIGHTLY',
    units: 2,
    guests: 3,
    arrivalOffsetDays: 3,
  },
  {
    category: 'Suite',
    rentalType: 'WEEKLY',
    units: 1,
    guests: 4,
    arrivalOffsetDays: 4,
  },
  {
    category: 'Deluxe Room',
    rentalType: 'MONTHLY',
    units: 1,
    guests: 2,
    arrivalOffsetDays: 5,
  },
];

async function main(): Promise<void> {
  const expectedPath = resolve(
    fileURLToPath(
      new URL('../../nexora.demo.db', import.meta.url),
    ),
  );

  const runtimeUrl = process.env.NEXORA_RUNTIME_DATABASE_URL;
  const cliUrl = process.env.DATABASE_URL;

  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.NEXORA_ALLOW_DEMO_SEED !== 'true' ||
    !runtimeUrl?.startsWith('file:') ||
    !cliUrl?.startsWith('file:') ||
    resolve(runtimeUrl.slice(5)) !== expectedPath ||
    resolve(cliUrl.slice(5)) !== expectedPath
  ) {
    throw new Error(
      'Set development mode, NEXORA_ALLOW_DEMO_SEED=true, ' +
      'and both database URLs to backend/nexora.demo.db.',
    );
  }

  if (!existsSync(expectedPath)) {
    throw new Error(
      'Create the demo database with Prisma migrate deploy first.',
    );
  }

  activeGuestPhoneKeyId();

  const passwords = new PasswordService();
  const passwordHashes = new Map<string, string>();

  for (const account of DEMO_ACCOUNTS) {
    passwordHashes.set(
      account.email,
      await passwords.hashPassword(DEMO_PASSWORD),
    );
  }

  const prisma = new PrismaService();
  const capacity = new RoomRateCapacityService();
  const validation = new ReservationValidationService(
    prisma,
    capacity,
  );
  const acquisition = new ReservationAcquisitionService(
    prisma,
    validation,
  );

  try {
    await prisma.$connect();

    const summary = await prisma.$transaction(
      async (tx) => {
        // Acquire the SQLite write lock before checking seed eligibility.
        await tx.$executeRaw`
          UPDATE "Property" SET "id" = "id"
        `;

        const existingCounts = await Promise.all([
          tx.property.count(),
          tx.user.count(),
          tx.guest.count(),
          tx.roomType.count(),
          tx.room.count(),
          tx.reservation.count(),
          tx.payment.count(),
        ]);

        if (existingCounts.some((count) => count !== 0)) {
          throw new Error(
            'The demo database already contains business data.',
          );
        }

        for (const name of DEMO_ROLES) {
          await tx.role.upsert({
            where: { name },
            update: {},
            create: {
              name,
              description: 'Synthetic prototype demonstration role',
            },
          });
        }

        const property = await tx.property.create({
          data: {
            name: 'NEXORA Prototype Demo',
            address: 'Synthetic Demo Address',
            city: 'Demo City',
            province: 'Demo Province',
            country: 'Philippines',
            description: 'Synthetic local demonstration property.',
          },
        });

        const amenities = [];

        for (const name of [
          'Wi-Fi',
          'Air Conditioning',
          'Smart TV',
        ]) {
          const amenity = await tx.amenity.upsert({
            where: { name },
            update: {},
            create: { name },
          });

          amenities.push(amenity.id);
        }

        const categoryIds = new Map<string, string>();

        for (const category of DEMO_CATEGORIES) {
          const roomType = await tx.roomType.create({
            data: {
              propertyId: property.id,
              name: category.name,
              description: 'Synthetic demonstration room category.',
              capacity: category.capacity,
              includedOccupancy: category.includedOccupancy,
              baseRateCentavos: category.rates.NIGHTLY,
            },
          });

          categoryIds.set(category.name, roomType.id);

          for (const rentalType of RENTAL_TYPES) {
            await tx.rentalRate.create({
              data: {
                roomTypeId: roomType.id,
                rentalType,
                rateCentavos: category.rates[rentalType],
                extraPersonFeeCentavos:
                  EXTRA_PERSON_FEES[rentalType],
              },
            });
          }

          for (const roomNumber of category.rooms) {
            await tx.room.create({
              data: {
                roomTypeId: roomType.id,
                roomNumber,
                floor: roomNumber[0],
                status: 'READY',
              },
            });
          }

          for (const amenityId of amenities) {
            await tx.roomTypeAmenity.create({
              data: {
                roomTypeId: roomType.id,
                amenityId,
              },
            });
          }
        }

        for (const account of DEMO_ACCOUNTS) {
          const role = await tx.role.findUniqueOrThrow({
            where: { name: account.role },
          });

          const passwordHash = passwordHashes.get(account.email);

          if (!passwordHash) {
            throw new Error('A demo password hash is missing.');
          }

          const user = await tx.user.create({
            data: {
              name: `${account.firstName} ${account.lastName}`,
              email: account.email,
              roleId: role.id,
              status: account.status,
              mustChangePassword: false,
              passwordHash,
            },
          });

          if (account.role === 'GUEST') {
            const guestId = randomUUID();

            await tx.guest.create({
              data: {
                id: guestId,
                userId: user.id,
                firstName: account.firstName,
                lastName: account.lastName,
                email: account.email,
                phone: encryptGuestPhone(
                  '000-000-0001',
                  guestId,
                ),
              },
            });
          }
        }

        const booker = await tx.user.findUniqueOrThrow({
          where: { email: 'guest@nexora.example' },
        });

        const guest = await tx.guest.findUniqueOrThrow({
          where: { userId: booker.id },
        });

        const today = todayInPhilippines();
        const bookings = [];

        for (const scenario of DEMO_BOOKINGS) {
          const roomTypeId = categoryIds.get(scenario.category);

          if (!roomTypeId) {
            throw new Error('A demo room category is missing.');
          }

          const checkIn = new Date(
            today.getTime() +
            scenario.arrivalOffsetDays * 86_400_000,
          ).toISOString().slice(0, 10);

          const arrivalTime = '15:00';
          const arrival = new Date(
            `${checkIn}T${arrivalTime}:00+08:00`,
          );

          const departure = new Date(
            arrival.getTime() +
            rentalDurationMinutes(
              scenario.rentalType,
              scenario.units,
            ) * 60_000,
          );

          const input: CreateReservationDto = {
            roomTypeId,
            checkIn,
            checkOut: calendarMarker(departure)
              .toISOString()
              .slice(0, 10),
            guests: scenario.guests,
            rentalType: scenario.rentalType,
            rentalUnits: scenario.units,
            arrivalTime,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: booker.email,
          };

          const now = new Date();

          const reservation = await acquisition.acquireInTx(
            tx,
            input,
            'HOLD',
            now,
            guest.id,
          );

          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              ...initialGuestBookingTiming(
                {
                  checkIn,
                  arrivalTime,
                  paymentPreference: 'PAY_AT_PROPERTY',
                },
                now,
                HOLD_DURATION_MS,
              ),
              paymentPreference: 'PAY_AT_PROPERTY',
            },
          });

          bookings.push({
            reference: reservation.reservationNumber,
            rentalType: scenario.rentalType,
            units: scenario.units,
            arrivalDate: checkIn,
            totalPesos: reservation.totalAmountCentavos / 100,
            status: reservation.status,
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'demo.dataset_created',
            entityType: 'Property',
            entityId: property.id,
            detailsJson: JSON.stringify({
              version: 1,
              accounts: DEMO_ACCOUNTS.length,
              reservations: bookings.length,
            }),
          },
        });

        return {
          accounts: DEMO_ACCOUNTS.length,
          guestAccounts: 4,
          roomTypes: DEMO_CATEGORIES.length,
          rooms: 9,
          rentalRates: 12,
          bookings,
        };
      },
      { timeout: 30_000 },
    );

    console.log(JSON.stringify(summary, null, 2));
    console.log('Synthetic demo initialization completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Demo initialization failed:',
    error instanceof Error ? error.message : 'Unknown error.',
  );
  process.exitCode = 1;
});