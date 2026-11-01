import 'reflect-metadata';

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';

import { resolve } from 'node:path';

import {
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';

import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import {
  PrismaBetterSqlite3,
} from '@prisma/adapter-better-sqlite3';

import request from 'supertest';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

import {
  JwtAuthGuard,
} from '../common/guards/jwt-auth.guard.js';

import {
  RolesGuard,
} from '../common/guards/roles.guard.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  ReservationsModule,
} from './reservations.module.js';

let app: INestApplication;
let prisma: PrismaClient;
let directory: string;
let roomTypeId: string;
let roomId: string;

const origin = 'http://localhost:5173';
const endpoint = '/api/reservations/pay-at-property';

function date(days: number) {
  return new Date(
    todayInPhilippines().getTime() +
    days * 86_400_000,
  ).toISOString().slice(0, 10);
}

function input() {
  return {
    roomTypeId,
    checkIn: date(10),
    checkOut: date(13),
    guests: 2,
    firstName: 'Test',
    lastName: 'Guest',
    email: 'test@example.test',
  };
}

describe(
  'Step 4 — accountless Pay at Property HTTP checkout',
  () => {
    beforeEach(async () => {
      vi.stubEnv('AUTH_ALLOWED_ORIGINS', origin);

      directory = mkdtempSync(
        resolve(process.cwd(), '.phase6-checkout-'),
      );

      const databasePath = resolve(
        directory,
        'checkout.test.db',
      ).replaceAll('\\', '/');

      prisma = new PrismaClient({
        adapter: new PrismaBetterSqlite3({
          url: `file:${databasePath}`,
          timeout: 0,
        }),
      });

      await prisma.$connect();

      const migrations = resolve(
        process.cwd(),
        'prisma/migrations',
      );

      // For the current checked-in migration files,
      // which do not contain SQL triggers.
      const entries = readdirSync(migrations, {
        withFileTypes: true,
      })
        .filter((item) => item.isDirectory())
        .sort((a, b) =>
          a.name.localeCompare(b.name),
        );

      for (const entry of entries) {
        const sql = readFileSync(
          resolve(
            migrations,
            entry.name,
            'migration.sql',
          ),
          'utf8',
        );

        const statements = sql
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean);

        for (const statement of statements) {
          await prisma.$executeRawUnsafe(statement);
        }
      }

      const property = await prisma.property.create({
        data: {
          name: 'Test Property',
          address: 'Test',
          city: 'Test',
          province: 'Test',
        },
      });

      const type = await prisma.roomType.create({
        data: {
          propertyId: property.id,
          name: 'Deluxe',
          capacity: 2,
          baseRateCentavos: 250_000,
        },
      });

      roomTypeId = type.id;

      const room = await prisma.room.create({
        data: {
          roomTypeId,
          roomNumber: '101',
        },
      });

      roomId = room.id;

      const module = await Test.createTestingModule({
        imports: [
          ReservationsModule,
          ThrottlerModule.forRoot([
            {
              ttl: 60_000,
              limit: 60,
            },
          ]),
        ],
        providers: [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
          {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
          },
          {
            provide: APP_GUARD,
            useClass: RolesGuard,
          },
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(prisma)
        .compile();

      app = module.createNestApplication();

      app.setGlobalPrefix('api');

      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );

      await app.init();
    });

    afterEach(async () => {
      await app?.close();
      await prisma?.$disconnect();

      vi.unstubAllEnvs();

      const root = resolve(process.cwd());

      if (
        directory &&
        directory.startsWith(
          resolve(root, '.phase6-checkout-'),
        ) &&
        resolve(directory, '..') === root
      ) {
        rmSync(directory, {
          recursive: true,
          force: true,
        });
      }
    });

    it(
      'creates an accountless confirmed booking without payment or assignment',
      async () => {
        const response = await request(
          app.getHttpServer(),
        )
          .post(endpoint)
          .set('Origin', origin)
          .send(input())
          .expect(201);

        expect(
          response.headers['cache-control'],
        ).toBe('no-store');

        expect(response.body.data).toEqual({
          reservationNumber:
            expect.stringMatching(/^NX-/),
          status: 'CONFIRMED',
          nightlyRateCentavos: 250_000,
          totalAmountCentavos: 750_000,
        });

        expect(
          await prisma.reservation.count(),
        ).toBe(1);

        expect(
          await prisma.user.count(),
        ).toBe(0);

        expect(
          await prisma.payment.count(),
        ).toBe(0);

        expect(
          await prisma.roomAssignment.count(),
        ).toBe(0);
      },
    );

    for (
      const extra of [
        { status: 'CONFIRMED' },
        { totalAmountCentavos: 1 },
        { paymentMethod: 'PAYMONGO' },
      ]
    ) {
      it(
        `rejects unauthorized client field ${Object.keys(extra)[0]}`,
        async () => {
          await request(app.getHttpServer())
            .post(endpoint)
            .set('Origin', origin)
            .send({
              ...input(),
              ...extra,
            })
            .expect(400);

          expect(
            await prisma.reservation.count(),
          ).toBe(0);
        },
      );
    }

    it('rejects an unapproved origin', async () => {
      await request(app.getHttpServer())
        .post(endpoint)
        .set('Origin', 'https://unapproved.example')
        .send(input())
        .expect(403);

      expect(
        await prisma.reservation.count(),
      ).toBe(0);
    });

    it('rejects a missing origin', async () => {
      await request(app.getHttpServer())
        .post(endpoint)
        .send(input())
        .expect(403);
    });

    it(
      'rejects invalid dates and capacity',
      async () => {
        await request(app.getHttpServer())
          .post(endpoint)
          .set('Origin', origin)
          .send({
            ...input(),
            checkOut: date(9),
          })
          .expect(400);

        await request(app.getHttpServer())
          .post(endpoint)
          .set('Origin', origin)
          .send({
            ...input(),
            guests: 3,
          })
          .expect(400);

        expect(
          await prisma.guest.count(),
        ).toBe(0);
      },
    );

    it(
      'returns 409 when a block removes the last room',
      async () => {
        await prisma.roomBlock.create({
          data: {
            roomId,
            startDate: new Date(
              `${date(10)}T00:00:00Z`,
            ),
            endDate: new Date(
              `${date(13)}T00:00:00Z`,
            ),
            reason: 'Test block',
          },
        });

        await request(app.getHttpServer())
          .post(endpoint)
          .set('Origin', origin)
          .send(input())
          .expect(409);

        expect(
          await prisma.guest.count(),
        ).toBe(0);
      },
    );

    it(
      'reads the current server rate when creating the booking',
      async () => {
        await prisma.roomType.update({
          where: {
            id: roomTypeId,
          },
          data: {
            baseRateCentavos: 300_000,
          },
        });

        const response = await request(
          app.getHttpServer(),
        )
          .post(endpoint)
          .set('Origin', origin)
          .send(input())
          .expect(201);

        expect(
          response.body.data.totalAmountCentavos,
        ).toBe(900_000);
      },
    );

    it(
      'throttles repeated booking requests',
      async () => {
        await request(app.getHttpServer())
          .post(endpoint)
          .set('Origin', origin)
          .send(input())
          .expect(201);

        for (let count = 0; count < 4; count += 1) {
          await request(app.getHttpServer())
            .post(endpoint)
            .set('Origin', origin)
            .send(input())
            .expect(409);
        }

        await request(app.getHttpServer())
          .post(endpoint)
          .set('Origin', origin)
          .send(input())
          .expect(429);
      },
    );
  },
);