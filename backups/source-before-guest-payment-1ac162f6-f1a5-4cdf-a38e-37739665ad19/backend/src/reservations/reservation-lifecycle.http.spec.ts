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
  ConflictException,
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

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
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
  type ReservationStatus,
} from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import { ReservationsModule } from './reservations.module.js';

import {
  ReservationLifecycleService,
} from './reservation-lifecycle.service.js';

import {
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

import {
  withInventoryWrite,
} from './inventory-write.js';

import {
  assertReservationTransition,
  expirePendingHoldsInTx,
} from './reservation-lifecycle.js';

const secret =
  'isolated-reservation-lifecycle-test-secret-at-least-32-bytes';

const endpoint =
  '/api/reservations/lifecycle/expire-holds';

let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;
let lifecycle: ReservationLifecycleService;
let acquisition: ReservationAcquisitionService;

let propertyId: string;
let roomTypeId: string;
let roomId: string;
let guestId: string;
let sequence: number;

let users: Record<
  string,
  { id: string; email: string; role: string }
>;

function date(days: number) {
  return new Date(
    todayInPhilippines().getTime() +
    days * 86_400_000,
  );
}

function bearer(role = 'MANAGER') {
  return `Bearer ${jwt.sign({
    sub: users[role].id,
    jti: randomUUID(),
  })}`;
}

async function seedHold(
  expiresAt: Date | null,
  status: ReservationStatus = 'PENDING',
  typeId = roomTypeId,
) {
  const start = 10 + sequence++ * 4;

  return prisma.reservation.create({
    data: {
      reservationNumber: `NX-${randomUUID()}`,
      guestId,
      roomTypeId: typeId,
      checkInDate: date(start),
      checkOutDate: date(start + 3),
      guestCount: 2,
      nightlyRateCentavos: 250_000,
      totalAmountCentavos: 750_000,
      status,
      holdExpiresAt: expiresAt,
    },
  });
}

async function assignHold(reservationId: string) {
  return prisma.roomAssignment.create({
    data: {
      reservationId,
      roomId,
      assignedAt: new Date(Date.now() - 120_000),
    },
  });
}

it(
  'defines forward transitions without permitting terminal revival or skipped check-in',
  () => {
    expect(() =>
      assertReservationTransition(
        'PENDING',
        'EXPIRED',
      ),
    ).not.toThrow();

    expect(() =>
      assertReservationTransition(
        'PENDING',
        'CONFIRMED',
      ),
    ).not.toThrow();

    for (
      const terminal of [
        'EXPIRED',
        'CANCELLED',
        'CHECKED_OUT',
      ] as const
    ) {
      expect(() =>
        assertReservationTransition(
          terminal,
          'CONFIRMED',
        ),
      ).toThrow(ConflictException);
    }

    expect(() =>
      assertReservationTransition(
        'PENDING',
        'CHECKED_IN',
      ),
    ).toThrow(ConflictException);
  },
);

describe(
  'Step 7 — lifecycle and transactional hold expiration',
  () => {
    beforeEach(async () => {
      vi.stubEnv('JWT_ACCESS_SECRET', secret);
      sequence = 0;

      directory = mkdtempSync(
        resolve(process.cwd(), '.phase6-lifecycle-'),
      );

      prisma = new PrismaClient({
        adapter: new PrismaBetterSqlite3({
          url: `file:${resolve(
            directory,
            'lifecycle.test.db',
          ).replaceAll('\\', '/')}`,
          timeout: 0,
        }),
      });

      await prisma.$connect();

      const migrations = resolve(
        process.cwd(),
        'prisma/migrations',
      );

      const entries = readdirSync(migrations, {
        withFileTypes: true,
      })
        .filter((item) => item.isDirectory())
        .sort((a, b) =>
          a.name.localeCompare(b.name),
        );

      // For the current checked-in migration files,
      // which contain no SQL triggers.
      for (const entry of entries) {
        const sql = readFileSync(
          resolve(
            migrations,
            entry.name,
            'migration.sql',
          ),
          'utf8',
        );

        for (
          const statement of sql
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
        ) {
          await prisma.$executeRawUnsafe(statement);
        }
      }

      propertyId = (
        await prisma.property.create({
          data: {
            name: 'Test',
            address: 'Test',
            city: 'Test',
            province: 'Test',
          },
        })
      ).id;

      roomTypeId = (
        await prisma.roomType.create({
          data: {
            propertyId,
            name: 'Deluxe',
            capacity: 2,
            baseRateCentavos: 250_000,
          },
        })
      ).id;

      roomId = (
        await prisma.room.create({
          data: {
            roomTypeId,
            roomNumber: '101',
          },
        })
      ).id;

      guestId = (
        await prisma.guest.create({
          data: {
            firstName: 'Test',
            lastName: 'Guest',
          },
        })
      ).id;

      users = {};

      for (
        const name of [
          'ADMIN',
          'MANAGER',
          'RECEPTIONIST',
          'GUEST',
        ]
      ) {
        const role = await prisma.role.create({
          data: { name },
        });

        const user = await prisma.user.create({
          data: {
            roleId: role.id,
            name: 'Test User',
            email: `${name.toLowerCase()}@example.test`,
            passwordHash: 'test-only-not-used-for-login',
            status: 'ACTIVE',
          },
        });

        users[name] = {
          id: user.id,
          email: user.email,
          role: name,
        };
      }

      const module = await Test.createTestingModule({
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
            { ttl: 60_000, limit: 1000 },
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

      lifecycle = module.get(
        ReservationLifecycleService,
      );

      acquisition = module.get(
        ReservationAcquisitionService,
      );

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
          resolve(root, '.phase6-lifecycle-'),
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
      'rejects unauthenticated, accountless-cookie, guest and disabled-user requests',
      async () => {
        await request(app.getHttpServer())
          .post(endpoint)
          .send({})
          .expect(401);

        await request(app.getHttpServer())
          .post(endpoint)
          .set('Cookie', 'nexora_booking_access=fake')
          .send({})
          .expect(401);

        await request(app.getHttpServer())
          .post(endpoint)
          .set('Authorization', bearer('GUEST'))
          .send({})
          .expect(403);

        await prisma.user.update({
          where: { id: users.MANAGER.id },
          data: { status: 'DISABLED' },
        });

        await request(app.getHttpServer())
          .post(endpoint)
          .set('Authorization', bearer())
          .send({})
          .expect(401);
      },
    );

    it(
      'allows the three approved staff roles and records the trusted actor',
      async () => {
        for (
          const role of [
            'ADMIN',
            'MANAGER',
            'RECEPTIONIST',
          ]
        ) {
          const hold = await seedHold(
            new Date(Date.now() - 60_000),
          );

          const result = await request(
            app.getHttpServer(),
          )
            .post(endpoint)
            .set('Authorization', bearer(role))
            .send({})
            .expect(200);

          expect(
            result.headers['cache-control'],
          ).toBe('no-store');

          expect(result.body.data).toEqual({
            expiredCount: 1,
            releasedAssignmentCount: 0,
            hasMore: false,
          });

          const audit =
            await prisma.auditLog.findFirstOrThrow({
              where: { entityId: hold.id },
            });

          expect(audit.actorUserId)
            .toBe(users[role].id);
        }
      },
    );

    it(
      'accepts an empty request and reports no work',
      async () => {
        const result = await request(
          app.getHttpServer(),
        )
          .post(endpoint)
          .set('Authorization', bearer())
          .expect(200);

        expect(result.body.data).toEqual({
          expiredCount: 0,
          releasedAssignmentCount: 0,
          hasMore: false,
        });
      },
    );

    it(
      'rejects invalid batch sizes and client-controlled cutoff, actor or status',
      async () => {
        for (
          const input of [
            { limit: 0 },
            { limit: 101 },
            { limit: 1.5 },
            { limit: '2' },
            { now: '2100-01-01' },
            { actorUserId: users.ADMIN.id },
            { status: 'CONFIRMED' },
          ]
        ) {
          await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', bearer())
            .send(input)
            .expect(400);
        }
      },
    );

    it(
      'expires only eligible PENDING holds and preserves rates and other statuses',
      async () => {
        const past = new Date(Date.now() - 60_000);

        const expired = await seedHold(past);
        const future = await seedHold(
          new Date(Date.now() + 60_000),
        );
        const legacy = await seedHold(null);
        const confirmed = await seedHold(
          past,
          'CONFIRMED',
        );
        const cancelled = await seedHold(
          past,
          'CANCELLED',
        );
        const alreadyExpired = await seedHold(
          past,
          'EXPIRED',
        );

        const result =
          await lifecycle.expireHolds(users.MANAGER);

        expect(result.expiredCount).toBe(1);

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: expired.id },
          });

        expect(stored.status).toBe('EXPIRED');
        expect(stored.holdExpiresAt).toEqual(past);
        expect(stored.nightlyRateCentavos).toBe(250_000);
        expect(stored.totalAmountCentavos).toBe(750_000);

        for (
          const original of [
            future,
            legacy,
            confirmed,
            cancelled,
            alreadyExpired,
          ]
        ) {
          const unchanged =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: original.id },
            });

          expect(unchanged.status)
            .toBe(original.status);
        }

        expect(await prisma.payment.count()).toBe(0);
      },
    );

    it(
      'uses an inclusive expiration boundary and excludes a hold one millisecond later',
      async () => {
        const now = new Date(
          '2035-01-01T00:00:00Z',
        );

        const equal = await seedHold(now);
        const later = await seedHold(
          new Date(now.getTime() + 1),
        );

        await withInventoryWrite(
          prisma as PrismaService,
          (tx) => expirePendingHoldsInTx(tx, {
            propertyId,
            now,
          }),
        );

        expect(
          (
            await prisma.reservation.findUniqueOrThrow({
              where: { id: equal.id },
            })
          ).status,
        ).toBe('EXPIRED');

        expect(
          (
            await prisma.reservation.findUniqueOrThrow({
              where: { id: later.id },
            })
          ).status,
        ).toBe('PENDING');
      },
    );

    it(
      'releases active assignments and preserves previous assignment history',
      async () => {
        const hold = await seedHold(
          new Date(Date.now() - 60_000),
        );

        const historicalTime =
          new Date(Date.now() - 180_000);

        const historical =
          await prisma.roomAssignment.create({
            data: {
              reservationId: hold.id,
              roomId,
              assignedAt:
                new Date(Date.now() - 240_000),
              releasedAt: historicalTime,
            },
          });

        const active = await assignHold(hold.id);

        const result =
          await lifecycle.expireHolds(users.MANAGER);

        expect(result.releasedAssignmentCount).toBe(1);

        const stored =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: active.id },
          });

        expect(stored.releasedAt).not.toBeNull();
        expect(stored.assignedAt)
          .toEqual(active.assignedAt);

        const old =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: historical.id },
          });

        expect(old.releasedAt)
          .toEqual(historicalTime);

        expect(
          await prisma.roomAssignment.count(),
        ).toBe(2);

        const room =
          await prisma.room.findUniqueOrThrow({
            where: { id: roomId },
          });

        expect(room.status).toBe('READY');
      },
    );

    it(
      'repeated cleanup does not duplicate expiration or audit events',
      async () => {
        const hold = await seedHold(
          new Date(Date.now() - 60_000),
        );

        await assignHold(hold.id);
        await lifecycle.expireHolds(users.MANAGER);

        expect(
          await lifecycle.expireHolds(users.MANAGER),
        ).toEqual({
          expiredCount: 0,
          releasedAssignmentCount: 0,
          hasMore: false,
        });

        expect(await prisma.auditLog.count()).toBe(1);
      },
    );

    it(
      'bounds the batch, processes oldest expirations first and reports more work',
      async () => {
        const oldest = await seedHold(
          new Date(Date.now() - 180_000),
        );
        const middle = await seedHold(
          new Date(Date.now() - 120_000),
        );
        const newest = await seedHold(
          new Date(Date.now() - 60_000),
        );

        expect(
          await lifecycle.expireHolds(
            users.MANAGER,
            2,
          ),
        ).toEqual({
          expiredCount: 2,
          releasedAssignmentCount: 0,
          hasMore: true,
        });

        for (const hold of [oldest, middle]) {
          const stored =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: hold.id },
            });

          expect(stored.status).toBe('EXPIRED');
        }

        const remaining =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: newest.id },
          });

        expect(remaining.status).toBe('PENDING');

        expect(
          (
            await lifecycle.expireHolds(
              users.MANAGER,
              2,
            )
          ).hasMore,
        ).toBe(false);

        expect(await prisma.auditLog.count()).toBe(3);
      },
    );

    it(
      'rolls back the entire batch if its second audit write fails',
      async () => {
        const first = await seedHold(
          new Date(Date.now() - 120_000),
        );
        const second = await seedHold(
          new Date(Date.now() - 60_000),
        );

        await assignHold(first.id);
        await assignHold(second.id);

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_expiration_audit
          BEFORE INSERT ON "AuditLog"
          WHEN (SELECT COUNT(*) FROM "AuditLog") >= 1
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only expiration audit failure'
            );
          END
        `);

        await expect(
          lifecycle.expireHolds(users.MANAGER),
        ).rejects.toThrow();

        expect(
          await prisma.reservation.count({
            where: { status: 'PENDING' },
          }),
        ).toBe(2);

        expect(
          await prisma.roomAssignment.count({
            where: { releasedAt: null },
          }),
        ).toBe(2);

        expect(await prisma.auditLog.count()).toBe(0);
      },
    );

    it(
      'expires each hold exactly once across independent database clients',
      async () => {
        const first = await seedHold(
          new Date(Date.now() - 120_000),
        );
        const second = await seedHold(
          new Date(Date.now() - 60_000),
        );

        await assignHold(first.id);
        await assignHold(second.id);

        const other = new PrismaClient({
          adapter: new PrismaBetterSqlite3({
            url: `file:${resolve(
              directory,
              'lifecycle.test.db',
            ).replaceAll('\\', '/')}`,
            timeout: 0,
          }),
        });

        try {
          const otherService =
            new ReservationLifecycleService(
              other as PrismaService,
            );

          const results = await Promise.all([
            lifecycle.expireHolds(users.MANAGER),
            otherService.expireHolds(users.ADMIN),
          ]);

          expect(
            results
              .map((result) => result.expiredCount)
              .sort(),
          ).toEqual([0, 2]);

          expect(
            results.reduce(
              (sum, result) =>
                sum + result.releasedAssignmentCount,
              0,
            ),
          ).toBe(2);

          expect(
            await prisma.auditLog.count(),
          ).toBe(2);
        } finally {
          await other.$disconnect();
        }
      },
    );

    it(
      'uses the same expiration, assignment release and system audit during acquisition',
      async () => {
        const hold = await seedHold(
          new Date(Date.now() - 60_000),
        );

        const assignment = await assignHold(hold.id);

        await acquisition.acquire(
          {
            roomTypeId,
            checkIn:
              date(10).toISOString().slice(0, 10),
            checkOut:
              date(13).toISOString().slice(0, 10),
            guests: 2,
            firstName: 'New',
            lastName: 'Guest',
            email: 'new@example.test',
          },
          'CONFIRMED',
        );

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: hold.id },
          });

        expect(stored.status).toBe('EXPIRED');

        const released =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignment.id },
          });

        expect(released.releasedAt).not.toBeNull();

        expect(
          (
            await prisma.auditLog.findFirstOrThrow()
          ).actorUserId,
        ).toBeNull();
      },
    );

    it(
      'rolls back automatic expiration and assignment release if acquisition fails',
      async () => {
        const hold = await seedHold(
          new Date(Date.now() - 60_000),
        );

        const assignment = await assignHold(hold.id);

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_new_reservation
          BEFORE INSERT ON "Reservation"
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only booking failure'
            );
          END
        `);

        await expect(
          acquisition.acquire(
            {
              roomTypeId,
              checkIn:
                date(10).toISOString().slice(0, 10),
              checkOut:
                date(13).toISOString().slice(0, 10),
              guests: 2,
              firstName: 'New',
              lastName: 'Guest',
              email: 'new@example.test',
            },
            'CONFIRMED',
          ),
        ).rejects.toThrow();

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: hold.id },
          });

        expect(stored.status).toBe('PENDING');

        const originalAssignment =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignment.id },
          });

        expect(originalAssignment.releasedAt)
          .toBeNull();

        expect(await prisma.guest.count()).toBe(1);
        expect(await prisma.auditLog.count()).toBe(0);
      },
    );

    it(
      'limits acquisition cleanup to its selected room type',
      async () => {
        const selected = await seedHold(
          new Date(Date.now() - 60_000),
        );

        const otherType =
          await prisma.roomType.create({
            data: {
              propertyId,
              name: 'Other',
              capacity: 2,
              baseRateCentavos: 250_000,
            },
          });

        const other = await seedHold(
          new Date(Date.now() - 60_000),
          'PENDING',
          otherType.id,
        );

        await acquisition.acquire(
          {
            roomTypeId,
            checkIn:
              date(10).toISOString().slice(0, 10),
            checkOut:
              date(13).toISOString().slice(0, 10),
            guests: 2,
            firstName: 'New',
            lastName: 'Guest',
            email: 'new@example.test',
          },
          'CONFIRMED',
        );

        expect(
          (
            await prisma.reservation.findUniqueOrThrow({
              where: { id: selected.id },
            })
          ).status,
        ).toBe('EXPIRED');

        expect(
          (
            await prisma.reservation.findUniqueOrThrow({
              where: { id: other.id },
            })
          ).status,
        ).toBe('PENDING');
      },
    );

    it(
      'keeps helper cleanup within the trusted property scope',
      async () => {
        const selected = await seedHold(
          new Date(Date.now() - 60_000),
        );

        const otherProperty =
          await prisma.property.create({
            data: {
              name: 'Other',
              address: 'Test',
              city: 'Test',
              province: 'Test',
            },
          });

        const otherType =
          await prisma.roomType.create({
            data: {
              propertyId: otherProperty.id,
              name: 'Other',
              capacity: 2,
              baseRateCentavos: 250_000,
            },
          });

        const other = await seedHold(
          new Date(Date.now() - 60_000),
          'PENDING',
          otherType.id,
        );

        await withInventoryWrite(
          prisma as PrismaService,
          (tx) => expirePendingHoldsInTx(tx, {
            propertyId,
            now: new Date(),
          }),
        );

        expect(
          (
            await prisma.reservation.findUniqueOrThrow({
              where: { id: selected.id },
            })
          ).status,
        ).toBe('EXPIRED');

        expect(
          (
            await prisma.reservation.findUniqueOrThrow({
              where: { id: other.id },
            })
          ).status,
        ).toBe('PENDING');

        await expect(
          lifecycle.expireHolds(users.MANAGER),
        ).rejects.toThrow('Exactly one property');
      },
    );
  },
);