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
  type ReservationStatus,
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
} from './reservations.module.js';

import {
  ReservationCancellationService,
} from './reservation-cancellation.service.js';

import {
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

import {
  ReservationLifecycleService,
} from './reservation-lifecycle.service.js';

import {
  RoomAssignmentsService,
} from './room-assignments.service.js';

import {
  UNPAID_CANCELLATION_POLICY,
} from './cancellation-policy.js';

const secret =
  'isolated-reservation-cancellation-test-secret-at-least-32-bytes';

let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;

let cancellation: ReservationCancellationService;
let acquisition: ReservationAcquisitionService;
let assignments: RoomAssignmentsService;
let lifecycle: ReservationLifecycleService;

let propertyId: string;
let roomTypeId: string;
let roomA: string;
let roomB: string;
let guestId: string;
let bookingId: string;

let users: Record<
  string,
  {
    id: string;
    email: string;
    role: string;
  }
>;

function date(days: number) {
  return new Date(
    todayInPhilippines().getTime() +
      days * 86_400_000,
  );
}

function endpoint(id = bookingId) {
  return `/api/reservations/${id}/cancel`;
}

function bearer(role = 'MANAGER') {
  return `Bearer ${jwt.sign({
    sub: users[role].id,
    jti: randomUUID(),
  })}`;
}

async function seedBooking(
  status: ReservationStatus = 'CONFIRMED',
  start = 10,
) {
  return prisma.reservation.create({
    data: {
      reservationNumber: `NX-${randomUUID()}`,
      guestId,
      roomTypeId,
      status,
      checkInDate: date(start),
      checkOutDate: date(start + 3),
      guestCount: 2,
      nightlyRateCentavos: 250_000,
      totalAmountCentavos: 750_000,
    },
  });
}

function bookingInput(start = 10) {
  return {
    roomTypeId,
    checkIn:
      date(start).toISOString().slice(0, 10),
    checkOut:
      date(start + 3).toISOString().slice(0, 10),
    guests: 2,
    firstName: 'New',
    lastName: 'Guest',
    email: 'new@example.test',
  };
}

async function cancel(
  reason = 'Guest requested cancellation',
  id = bookingId,
) {
  return request(app.getHttpServer())
    .post(endpoint(id))
    .set('Authorization', bearer())
    .send({ reason });
}

async function activeAssignment() {
  return prisma.roomAssignment.create({
    data: {
      reservationId: bookingId,
      roomId: roomA,
    },
  });
}

describe(
  'Step 8 — staff cancellation of unpaid bookings',
  () => {
    beforeEach(async () => {
      vi.stubEnv('JWT_ACCESS_SECRET', secret);

      directory = mkdtempSync(
        resolve(
          process.cwd(),
          '.phase6-cancellation-',
        ),
      );

      prisma = new PrismaClient({
        adapter: new PrismaBetterSqlite3({
          url:
            `file:${resolve(
              directory,
              'cancellation.test.db',
            ).replaceAll('\\', '/')}`,
          timeout: 0,
        }),
      });

      await prisma.$connect();

      const migrations = resolve(
        process.cwd(),
        'prisma/migrations',
      );

      const migrationDirectories = readdirSync(
        migrations,
        { withFileTypes: true },
      )
        .filter((item) => item.isDirectory())
        .sort((a, b) =>
          a.name.localeCompare(b.name),
        );

      for (const entry of migrationDirectories) {
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

      roomA = (
        await prisma.room.create({
          data: {
            roomTypeId,
            roomNumber: '101',
          },
        })
      ).id;

      roomB = (
        await prisma.room.create({
          data: {
            roomTypeId,
            roomNumber: '102',
          },
        })
      ).id;

      guestId = (
        await prisma.guest.create({
          data: {
            firstName: 'Test',
            lastName: 'Guest',
            email: 'guest@example.test',
          },
        })
      ).id;

      bookingId = (await seedBooking()).id;

      users = {};

      for (const name of [
        'ADMIN',
        'MANAGER',
        'RECEPTIONIST',
        'GUEST',
      ]) {
        const role = await prisma.role.create({
          data: { name },
        });

        const user = await prisma.user.create({
          data: {
            roleId: role.id,
            name: 'Test User',
            email:
              `${name.toLowerCase()}@example.test`,
            passwordHash:
              'test-only-not-used-for-login',
            status: 'ACTIVE',
          },
        });

        users[name] = {
          id: user.id,
          email: user.email,
          role: name,
        };
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

      cancellation = module.get(
        ReservationCancellationService,
      );

      acquisition = module.get(
        ReservationAcquisitionService,
      );

      assignments = module.get(
        RoomAssignmentsService,
      );

      lifecycle = module.get(
        ReservationLifecycleService,
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
          resolve(
            root,
            '.phase6-cancellation-',
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

    it(
      'rejects anonymous requests, accountless cookies, guest JWTs and disabled staff',
      async () => {
        await request(app.getHttpServer())
          .post(endpoint())
          .send({ reason: 'Test cancellation' })
          .expect(401);

        await request(app.getHttpServer())
          .post(endpoint())
          .set(
            'Cookie',
            'nexora_booking_access=fake',
          )
          .send({ reason: 'Test cancellation' })
          .expect(401);

        await prisma.guest.update({
          where: { id: guestId },
          data: {
            userId: users.GUEST.id,
          },
        });

        await request(app.getHttpServer())
          .post(endpoint())
          .set(
            'Authorization',
            bearer('GUEST'),
          )
          .send({ reason: 'My booking' })
          .expect(403);

        await prisma.user.update({
          where: {
            id: users.MANAGER.id,
          },
          data: {
            status: 'DISABLED',
          },
        });

        await request(app.getHttpServer())
          .post(endpoint())
          .set('Authorization', bearer())
          .send({ reason: 'Test cancellation' })
          .expect(401);

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(stored.status).toBe(
          'CONFIRMED',
        );
      },
    );

    it(
      'permits all three approved staff roles and records the trusted actor',
      async () => {
        let start = 14;

        for (const role of [
          'ADMIN',
          'MANAGER',
          'RECEPTIONIST',
        ]) {
          const booking =
            await seedBooking(
              'CONFIRMED',
              start,
            );

          start += 4;

          await request(app.getHttpServer())
            .post(endpoint(booking.id))
            .set(
              'Authorization',
              bearer(role),
            )
            .send({
              reason:
                'Guest requested cancellation',
            })
            .expect(200);

          const audit =
            await prisma.auditLog.findFirstOrThrow({
              where: {
                entityId: booking.id,
                action:
                  'reservation.cancelled',
              },
            });

          expect(audit.actorUserId).toBe(
            users[role].id,
          );
        }
      },
    );

    it(
      'cancels atomically while preserving prices, guest details, history and room status',
      async () => {
        const historicalTime =
          new Date(Date.now() - 60_000);

        const historical =
          await prisma.roomAssignment.create({
            data: {
              reservationId: bookingId,
              roomId: roomB,
              assignedAt: new Date(
                Date.now() - 120_000,
              ),
              releasedAt: historicalTime,
            },
          });

        const active =
          await activeAssignment();

        const result = await cancel(
          '  Guest   requested cancellation  ',
        );

        expect(result.status).toBe(200);

        expect(
          result.headers['cache-control'],
        ).toBe('no-store');

        expect(result.body.data).toEqual({
          reservationNumber:
            expect.stringMatching(/^NX-/),
          status: 'CANCELLED',
          alreadyCancelled: false,
          releasedAssignmentCount: 1,
        });

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(stored.status).toBe(
          'CANCELLED',
        );

        expect(
          stored.nightlyRateCentavos,
        ).toBe(250_000);

        expect(
          stored.totalAmountCentavos,
        ).toBe(750_000);

        const released =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: active.id },
          });

        expect(
          released.releasedAt,
        ).not.toBeNull();

        const preserved =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: historical.id },
          });

        expect(
          preserved.releasedAt,
        ).toEqual(historicalTime);

        expect(
          await prisma.roomAssignment.count(),
        ).toBe(2);

        expect(
          await prisma.guest.count(),
        ).toBe(1);

        const room =
          await prisma.room.findUniqueOrThrow({
            where: { id: roomA },
          });

        expect(room.status).toBe('READY');

        expect(
          await prisma.payment.count(),
        ).toBe(0);

        expect(
          await prisma.refund.count(),
        ).toBe(0);

        const audit =
          await prisma.auditLog.findFirstOrThrow({
            where: {
              action:
                'reservation.cancelled',
            },
          });

        expect(
          JSON.parse(audit.detailsJson!),
        ).toEqual({
          reason:
            'Guest requested cancellation',
          previousStatus: 'CONFIRMED',
          releasedAssignmentCount: 1,
          policy:
            UNPAID_CANCELLATION_POLICY,
        });
      },
    );

    for (const expiry of [
      'FUTURE',
      'NULL',
    ] as const) {
      it(
        `permits cancellation of an eligible PENDING hold (${expiry})`,
        async () => {
          const holdExpiresAt =
            expiry === 'FUTURE'
              ? new Date(
                  Date.now() + 60_000,
                )
              : null;

          await prisma.reservation.update({
            where: { id: bookingId },
            data: {
              status: 'PENDING',
              holdExpiresAt,
            },
          });

          expect(
            (await cancel()).status,
          ).toBe(200);

          const stored =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          expect(
            stored.holdExpiresAt,
          ).toEqual(holdExpiresAt);
        },
      );
    }

    it(
      'keeps same-day unpaid cancellation fee-free',
      async () => {
        await prisma.reservation.update({
          where: { id: bookingId },
          data: {
            checkInDate: date(0),
            checkOutDate: date(2),
          },
        });

        expect(
          (await cancel()).status,
        ).toBe(200);

        const audit =
          await prisma.auditLog.findFirstOrThrow({
            where: {
              action:
                'reservation.cancelled',
            },
          });

        expect(
          JSON.parse(audit.detailsJson!)
            .policy.cancellationFeeCentavos,
        ).toBe(0);

        expect(
          await prisma.payment.count(),
        ).toBe(0);

        expect(
          await prisma.refund.count(),
        ).toBe(0);
      },
    );

    it(
      'keeps an expired pending hold on the expiration workflow',
      async () => {
        await prisma.reservation.update({
          where: { id: bookingId },
          data: {
            status: 'PENDING',
            holdExpiresAt: new Date(
              Date.now() - 1,
            ),
          },
        });

        expect(
          (await cancel()).status,
        ).toBe(409);

        await lifecycle.expireHolds(
          users.MANAGER,
        );

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(stored.status).toBe(
          'EXPIRED',
        );

        expect(
          await prisma.auditLog.count({
            where: {
              action:
                'reservation.cancelled',
            },
          }),
        ).toBe(0);
      },
    );

    for (const status of [
      'EXPIRED',
      'CHECKED_IN',
      'CHECKED_OUT',
    ] as const) {
      it(
        `rejects a ${status} reservation`,
        async () => {
          await prisma.reservation.update({
            where: { id: bookingId },
            data: { status },
          });

          expect(
            (await cancel()).status,
          ).toBe(409);

          const stored =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          expect(stored.status).toBe(
            status,
          );
        },
      );
    }

    it(
      'rejects a confirmed reservation after its stay has ended',
      async () => {
        await prisma.reservation.update({
          where: { id: bookingId },
          data: {
            checkInDate: date(-3),
            checkOutDate: date(0),
          },
        });

        expect(
          (await cancel()).status,
        ).toBe(409);
      },
    );

    for (const status of [
      'UNPAID',
      'PENDING',
      'PARTIALLY_PAID',
      'PAID',
      'FAILED',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
    ] as const) {
      it(
        `requires financial review when a ${status} payment record exists`,
        async () => {
          const payment =
            await prisma.payment.create({
              data: {
                reservationId: bookingId,
                method:
                  'PAY_AT_PROPERTY',
                status,
                amountCentavos:
                  750_000,
              },
            });

          expect(
            (await cancel()).status,
          ).toBe(409);

          expect(
            await prisma.payment.findUniqueOrThrow({
              where: {
                id: payment.id,
              },
            }),
          ).toEqual(payment);

          const stored =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          expect(stored.status).toBe(
            'CONFIRMED',
          );

          expect(
            await prisma.auditLog.count(),
          ).toBe(0);
        },
      );
    }

    it(
      'leaves refund history untouched when financial review is required',
      async () => {
        const payment =
          await prisma.payment.create({
            data: {
              reservationId: bookingId,
              method: 'PAY_AT_PROPERTY',
              status: 'PAID',
              amountCentavos: 750_000,
            },
          });

        const refund =
          await prisma.refund.create({
            data: {
              paymentId: payment.id,
              amountCentavos: 250_000,
              reason: 'Test',
              status: 'PENDING',
            },
          });

        expect(
          (await cancel()).status,
        ).toBe(409);

        expect(
          await prisma.refund.findUniqueOrThrow({
            where: { id: refund.id },
          }),
        ).toEqual(refund);
      },
    );

    it(
      'repeated requests preserve the original reason, timestamps and single audit event',
      async () => {
        const active =
          await activeAssignment();

        expect(
          (
            await cancel(
              'Original reason',
            )
          ).status,
        ).toBe(200);

        const first =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        const firstAssignment =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: active.id },
          });

        const repeated = await cancel(
          'A different retry reason',
        );

        expect(
          repeated.status,
        ).toBe(200);

        expect(
          repeated.body.data.alreadyCancelled,
        ).toBe(true);

        expect(
          repeated.body.data
            .releasedAssignmentCount,
        ).toBe(0);

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(
          stored.updatedAt,
        ).toEqual(first.updatedAt);

        const storedAssignment =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: active.id },
          });

        expect(
          storedAssignment.releasedAt,
        ).toEqual(
          firstAssignment.releasedAt,
        );

        expect(
          await prisma.auditLog.count(),
        ).toBe(1);

        const audit =
          await prisma.auditLog.findFirstOrThrow();

        expect(
          JSON.parse(audit.detailsJson!)
            .reason,
        ).toBe('Original reason');
      },
    );

    it(
      'rejects missing reasons, blank reasons, excessive length and privileged fields',
      async () => {
        const invalidInputs = [
          {},
          {
            reason: '   ',
          },
          {
            reason: 'x'.repeat(501),
          },
          {
            reason: 'Valid reason',
            status: 'CANCELLED',
          },
          {
            reason: 'Valid reason',
            cancellationFeeCentavos: 1,
          },
          {
            reason: 'Valid reason',
            actorUserId: users.ADMIN.id,
          },
        ];

        for (const input of invalidInputs) {
          await request(app.getHttpServer())
            .post(endpoint())
            .set(
              'Authorization',
              bearer(),
            )
            .send(input)
            .expect(400);
        }

        expect(
          await prisma.auditLog.count(),
        ).toBe(0);
      },
    );

    it(
      'returns 404 for a missing booking',
      async () => {
        expect(
          (
            await cancel(
              'Valid reason',
              'missing',
            )
          ).status,
        ).toBe(404);
      },
    );

    it(
      'releases inventory so the same room type can be booked again',
      async () => {
        await prisma.room.update({
          where: { id: roomB },
          data: {
            isActive: false,
          },
        });

        await activeAssignment();

        await expect(
          acquisition.acquire(
            bookingInput(),
            'CONFIRMED',
          ),
        ).rejects.toThrow(
          ConflictException,
        );

        expect(
          (await cancel()).status,
        ).toBe(200);

        await expect(
          acquisition.acquire(
            bookingInput(),
            'CONFIRMED',
          ),
        ).resolves.toHaveProperty(
          'status',
          'CONFIRMED',
        );
      },
    );

    it(
      'rolls back cancellation and assignment release when the audit write fails',
      async () => {
        const active =
          await activeAssignment();

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_cancellation_audit
          BEFORE INSERT ON "AuditLog"
          WHEN NEW.action = 'reservation.cancelled'
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only cancellation audit failure'
            );
          END
        `);

        await expect(
          cancellation.cancel(
            bookingId,
            'Valid reason',
            users.MANAGER,
          ),
        ).rejects.toThrow();

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(stored.status).toBe(
          'CONFIRMED',
        );

        const assignment =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: active.id },
          });

        expect(
          assignment.releasedAt,
        ).toBeNull();

        expect(
          await prisma.auditLog.count(),
        ).toBe(0);
      },
    );

    it(
      'rolls back the reservation when assignment release fails',
      async () => {
        const active =
          await activeAssignment();

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_assignment_release
          BEFORE UPDATE ON "RoomAssignment"
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only release failure'
            );
          END
        `);

        await expect(
          cancellation.cancel(
            bookingId,
            'Valid reason',
            users.MANAGER,
          ),
        ).rejects.toThrow();

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(stored.status).toBe(
          'CONFIRMED',
        );

        const assignment =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: active.id },
          });

        expect(
          assignment.releasedAt,
        ).toBeNull();

        expect(
          await prisma.auditLog.count(),
        ).toBe(0);
      },
    );

    it(
      'cancels exactly once across independent database clients',
      async () => {
        await activeAssignment();

        const other = new PrismaClient({
          adapter: new PrismaBetterSqlite3({
            url:
              `file:${resolve(
                directory,
                'cancellation.test.db',
              ).replaceAll('\\', '/')}`,
            timeout: 0,
          }),
        });

        try {
          const otherService =
            new ReservationCancellationService(
              other as PrismaService,
            );

          const results = await Promise.all([
            cancellation.cancel(
              bookingId,
              'First request',
              users.MANAGER,
            ),
            otherService.cancel(
              bookingId,
              'Second request',
              users.ADMIN,
            ),
          ]);

          expect(
            results
              .map(
                (result) =>
                  result.alreadyCancelled,
              )
              .sort(),
          ).toEqual([false, true]);

          expect(
            await prisma.auditLog.count(),
          ).toBe(1);

          expect(
            await prisma.roomAssignment.count({
              where: {
                releasedAt: null,
              },
            }),
          ).toBe(0);
        } finally {
          await other.$disconnect();
        }
      },
    );

    it(
      'cannot leave an active assignment when cancellation competes with assignment',
      async () => {
        const other = new PrismaClient({
          adapter: new PrismaBetterSqlite3({
            url:
              `file:${resolve(
                directory,
                'cancellation.test.db',
              ).replaceAll('\\', '/')}`,
            timeout: 0,
          }),
        });

        try {
          const otherService =
            new ReservationCancellationService(
              other as PrismaService,
            );

          const results =
            await Promise.allSettled([
              assignments.assign(
                bookingId,
                roomA,
                users.MANAGER,
              ),

              otherService.cancel(
                bookingId,
                'Guest requested cancellation',
                users.ADMIN,
              ),
            ]);

          expect(
            results[1].status,
          ).toBe('fulfilled');

          const stored =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          expect(stored.status).toBe(
            'CANCELLED',
          );

          expect(
            await prisma.roomAssignment.count({
              where: {
                releasedAt: null,
              },
            }),
          ).toBe(0);

          expect(
            await prisma.auditLog.count({
              where: {
                action:
                  'reservation.cancelled',
              },
            }),
          ).toBe(1);
        } finally {
          await other.$disconnect();
        }
      },
    );

    it(
      'stores the unpaid policy snapshot when a new booking is created',
      async () => {
        const booking =
          await acquisition.acquire(
            bookingInput(20),
            'CONFIRMED',
          );

        const audit =
          await prisma.auditLog.findFirstOrThrow({
            where: {
              entityId: booking.id,
              action:
                'reservation.cancellation_policy_recorded',
            },
          });

        expect(
          JSON.parse(audit.detailsJson!),
        ).toEqual(
          UNPAID_CANCELLATION_POLICY,
        );
      },
    );

    it(
      'rolls back booking and guest creation if saving the policy snapshot fails',
      async () => {
        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_policy_snapshot
          BEFORE INSERT ON "AuditLog"
          WHEN NEW.action =
            'reservation.cancellation_policy_recorded'
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only policy snapshot failure'
            );
          END
        `);

        await expect(
          acquisition.acquire(
            bookingInput(20),
            'CONFIRMED',
          ),
        ).rejects.toThrow();

        expect(
          await prisma.reservation.count(),
        ).toBe(1);

        expect(
          await prisma.guest.count(),
        ).toBe(1);

        expect(
          await prisma.auditLog.count(),
        ).toBe(0);
      },
    );

    it(
      'rejects invalid property configuration without changing a booking',
      async () => {
        await prisma.property.create({
          data: {
            name: 'Other',
            address: 'Test',
            city: 'Test',
            province: 'Test',
          },
        });

        await expect(
          cancellation.cancel(
            bookingId,
            'Valid reason',
            users.MANAGER,
          ),
        ).rejects.toThrow(
          'Exactly one property',
        );

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(stored.status).toBe(
          'CONFIRMED',
        );
      },
    );
  },
);