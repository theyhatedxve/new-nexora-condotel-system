import 'reflect-metadata';

import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';

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
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import {
  PrismaBetterSqlite3,
} from '@prisma/adapter-better-sqlite3';

import cookieParser from 'cookie-parser';
import request from 'supertest';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PrismaClient,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import { JwtStrategy } from '../auth/jwt.strategy.js';

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
} from '../reservations/reservations.module.js';

import {
  BOOKING_COOKIE,
} from '../reservations/booking-access.config.js';

const secret =
  'isolated-payment-summary-test-secret-at-least-32-bytes';

let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;
let bookingId: string;
let otherId: string;
let cookie: string;
let users: Record<string, string>;

const privatePath =
  '/api/reservations/access/payment-summary';

function path() {
  return `/api/payments/reservations/${bookingId}/summary`;
}

function bearer(role = 'MANAGER') {
  return `Bearer ${jwt.sign({
    sub: users[role],
    jti: randomUUID(),
  })}`;
}

describe(
  'Step 7.1 — scoped read-only payment summaries',
  () => {
    beforeEach(async () => {
      vi.stubEnv(
        'JWT_ACCESS_SECRET',
        secret,
      );

      vi.stubEnv('NODE_ENV', 'test');

      directory = mkdtempSync(
        resolve(
          process.cwd(),
          '.phase7-summary-',
        ),
      );

      prisma = new PrismaClient({
        adapter: new PrismaBetterSqlite3({
          url: `file:${resolve(
            directory,
            'summary.test.db',
          ).replaceAll('\\', '/')}`,
        }),
      });

      await prisma.$connect();

      const migrations = resolve(
        process.cwd(),
        'prisma/migrations',
      );

      const entries = readdirSync(
        migrations,
        { withFileTypes: true },
      )
        .filter(
          (item) => item.isDirectory(),
        )
        .sort(
          (a, b) =>
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

        // Suitable for the current migration files.
        const statements = sql
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean);

        for (const statement of statements) {
          await prisma.$executeRawUnsafe(
            statement,
          );
        }
      }

      const property =
        await prisma.property.create({
          data: {
            name: 'Test',
            address: 'Test',
            city: 'Test',
            province: 'Test',
          },
        });

      const type =
        await prisma.roomType.create({
          data: {
            propertyId: property.id,
            name: 'Deluxe',
            capacity: 2,
            baseRateCentavos: 250_000,
          },
        });

      users = {};

      for (const name of [
        'ADMIN',
        'MANAGER',
        'RECEPTIONIST',
        'GUEST',
        'OTHER_GUEST',
      ]) {
        const role =
          name === 'OTHER_GUEST'
            ? await prisma.role.findUniqueOrThrow({
                where: {
                  name: 'GUEST',
                },
              })
            : await prisma.role.create({
                data: { name },
              });

        users[name] = (
          await prisma.user.create({
            data: {
              roleId: role.id,
              name: 'Test',
              email: `${name}@example.test`,
              passwordHash: 'test-only',
              status: 'ACTIVE',
            },
          })
        ).id;
      }

      for (const role of [
        'GUEST',
        'OTHER_GUEST',
      ]) {
        const guest =
          await prisma.guest.create({
            data: {
              userId: users[role],
              firstName: 'Test',
              lastName: 'Guest',
            },
          });

        const booking =
          await prisma.reservation.create({
            data: {
              reservationNumber:
                `NX-${randomUUID()}`,
              guestId: guest.id,
              roomTypeId: type.id,
              status: 'CONFIRMED',
              checkInDate:
                todayInPhilippines(),
              checkOutDate: new Date(
                todayInPhilippines()
                  .getTime() +
                  3 * 86_400_000,
              ),
              guestCount: 2,
              nightlyRateCentavos:
                250_000,
              totalAmountCentavos:
                750_000,
            },
          });

        if (role === 'GUEST') {
          bookingId = booking.id;
        } else {
          otherId = booking.id;
        }
      }

      const token =
        randomBytes(32).toString('hex');

      await prisma.reservationAccessSession.create({
        data: {
          reservationId: bookingId,
          tokenHash: createHash('sha256')
            .update(token)
            .digest('hex'),
          expiresAt: new Date(
            Date.now() + 60_000,
          ),
        },
      });

      cookie =
        `${BOOKING_COOKIE}=${token}`;

      const module =
        await Test.createTestingModule({
          imports: [
            ReservationsModule,
            PassportModule,

            JwtModule.register({
              secret,
              signOptions: {
                algorithm: 'HS256',
                issuer: 'nexora-api',
                audience: 'nexora-web',
                expiresIn: '5m',
              },
            }),

            ThrottlerModule.forRoot([
              {
                ttl: 60_000,
                limit: 1000,
              },
            ]),
          ],
          providers: [
            JwtStrategy,
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

      jwt = module.get(JwtService);

      app = module.createNestApplication();

      app.setGlobalPrefix('api');
      app.use(cookieParser());

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
          resolve(
            root,
            '.phase7-summary-',
          ),
        ) &&
        resolve(directory, '..') === root
      ) {
        rmSync(directory, {
          recursive: true,
          force: true,
        });
      }
    });

    for (const role of [
      'ADMIN',
      'MANAGER',
      'RECEPTIONIST',
      'GUEST',
    ]) {
      it(
        `allows the authorized ${role} reader`,
        async () => {
          const result =
            await request(app.getHttpServer())
              .get(path())
              .set(
                'Authorization',
                bearer(role),
              )
              .expect(200);

          expect(
            result.headers['cache-control'],
          ).toBe('no-store');

          expect(
            result.body.data,
          ).toMatchObject({
            currency: 'PHP',
            status: 'UNPAID',
            balanceDueCentavos: 750_000,
          });
        },
      );
    }

    it(
      'rejects anonymous and disabled users',
      async () => {
        await request(app.getHttpServer())
          .get(path())
          .expect(401);

        await prisma.user.update({
          where: {
            id: users.MANAGER,
          },
          data: {
            status: 'DISABLED',
          },
        });

        await request(app.getHttpServer())
          .get(path())
          .set(
            'Authorization',
            bearer(),
          )
          .expect(401);
      },
    );

    it(
      'returns the same private 404 for another guest and a missing booking',
      async () => {
        const denied =
          await request(app.getHttpServer())
            .get(path())
            .set(
              'Authorization',
              bearer('OTHER_GUEST'),
            )
            .expect(404);

        const absent =
          await request(app.getHttpServer())
            .get(
              '/api/payments/reservations/missing/summary',
            )
            .set(
              'Authorization',
              bearer('OTHER_GUEST'),
            )
            .expect(404);

        expect(
          denied.body.message,
        ).toBe(absent.body.message);
      },
    );

    it(
      'uses only the verified session booking and exposes no payment identifiers',
      async () => {
        await prisma.payment.create({
          data: {
            reservationId: bookingId,
            method: 'PAY_AT_PROPERTY',
            status: 'PAID',
            amountCentavos: 250_000,
            paidAt: new Date(
              Date.now() - 1000,
            ),
            referenceNumber:
              'private-receipt',
          },
        });

        const result =
          await request(app.getHttpServer())
            .get(
              `${privatePath}?reservationId=${otherId}`,
            )
            .set('Cookie', cookie)
            .expect(200);

        expect(
          result.body.data,
        ).toMatchObject({
          status: 'PARTIALLY_PAID',
          netPaidCentavos: 250_000,
          balanceDueCentavos: 500_000,
        });

        const booking =
          await prisma.reservation.findUniqueOrThrow({
            where: {
              id: bookingId,
            },
          });

        expect(
          result.body.data.reservationNumber,
        ).toBe(
          booking.reservationNumber,
        );

        for (const field of [
          'id',
          'payments',
          'guestId',
          'referenceNumber',
          'providerPaymentId',
        ]) {
          expect(
            result.body.data,
          ).not.toHaveProperty(field);
        }

        expect(
          await prisma.auditLog.count(),
        ).toBe(0);

        expect(
          await prisma.payment.count(),
        ).toBe(1);

        expect(
          await prisma.refund.count(),
        ).toBe(0);
      },
    );

    it(
      'rejects missing, expired and revoked accountless sessions',
      async () => {
        await request(app.getHttpServer())
          .get(privatePath)
          .expect(404);

        await prisma.reservationAccessSession.updateMany({
          data: {
            expiresAt: new Date(
              Date.now() - 1000,
            ),
          },
        });

        await request(app.getHttpServer())
          .get(privatePath)
          .set('Cookie', cookie)
          .expect(404);

        await prisma.reservationAccessSession.updateMany({
          data: {
            expiresAt: new Date(
              Date.now() + 60_000,
            ),
            revokedAt: new Date(),
          },
        });

        await request(app.getHttpServer())
          .get(privatePath)
          .set('Cookie', cookie)
          .expect(404);
      },
    );
  },
);