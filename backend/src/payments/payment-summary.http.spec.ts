import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

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

const secret =
  'isolated-payment-summary-test-secret-at-least-32-bytes';

let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;
let bookingId: string;
let otherId: string;
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
    sv: 0,
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
      vi.stubEnv('NEXORA_BOOKING_DEADLINE_WORKER_ENABLED', 'false');

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

        const authorization = bearer();

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
            authorization,
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
      'uses the owned reservation path and exposes no payment identifiers',
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
              `${path()}?reservationId=${otherId}`,
            )
            .set('Authorization', bearer('GUEST'))
            .expect(200);

        expect(result.headers['cache-control']).toBe('no-store');
        expect(result.headers['set-cookie']).toBeUndefined();

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

    it('rejects a guest disabled after token issuance', async () => {
      const authorization = bearer('GUEST');

      await prisma.user.update({
        where: { id: users.GUEST },
        data: { status: 'DISABLED' },
      });

      await request(app.getHttpServer())
        .get(path())
        .set('Authorization', authorization)
        .expect(401);
    });

    it('rejects a legacy cookie on the authenticated summary route', async () => {
      await request(app.getHttpServer())
        .get(path())
        .set('Cookie', `nexora_booking_access=${'a'.repeat(64)}`)
        .expect(401);
    });

    for (const method of ['get', 'post'] as const) {
      for (const withCookie of [false, true]) {
        it(`retires ${method.toUpperCase()} accountless summaries with cookie=${withCookie}`, async () => {
          const pending = request(app.getHttpServer())[method](privatePath);

          if (withCookie) {
            pending.set('Cookie', `nexora_booking_access=${'a'.repeat(64)}`);
          }

          const result = await pending.expect(410);

          expect(result.headers['cache-control']).toBe('no-store');
          expect(result.headers['set-cookie']).toBeUndefined();
          expect(result.body).not.toHaveProperty('data');
          expect(await prisma.payment.count()).toBe(0);
          expect(await prisma.refund.count()).toBe(0);
          expect(await prisma.auditLog.count()).toBe(0);
        });
      }
    }
  },
);
