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
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';
import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';
import { RoomsModule } from '../rooms/rooms.module.js';

import {
  ReservationsModule,
} from './reservations.module.js';
import {
  BookingAccessService,
} from './booking-access.service.js';
import {
  BookingAccessEmailService,
} from './booking-access-email.service.js';
import {
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';
import {
  ReservationValidationService,
} from './reservation-validation.service.js';
import {
  ReservationLifecycleService,
} from './reservation-lifecycle.service.js';
import {
  ReservationStayService,
} from './reservation-stay.service.js';

const secret =
  'isolated-reservation-journey-test-secret-at-least-32-bytes';

const origin = 'http://localhost:5173';

let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;

let access: BookingAccessService;
let acquisition: ReservationAcquisitionService;
let lifecycle: ReservationLifecycleService;
let stays: ReservationStayService;

let roomTypeId: string;
let roomId: string;
let guestUserId: string;

let staff: {
  id: string;
  email: string;
  role: string;
};

let delivered: {
  email: string;
  token: string;
}[];

function date(days: number) {
  return new Date(
    todayInPhilippines().getTime() +
      days * 86_400_000,
  );
}

function input(
  email = 'guest@example.test',
) {
  return {
    roomTypeId,
    checkIn:
      date(0).toISOString().slice(0, 10),
    checkOut:
      date(3).toISOString().slice(0, 10),
    guests: 2,
    firstName: 'Test',
    lastName: 'Guest',
    email,
  };
}

function bearer(id = staff.id) {
  return `Bearer ${jwt.sign({
    sub: id,
    jti: randomUUID(),
  })}`;
}

function publicBooking(
  email = 'guest@example.test',
) {
  return request(app.getHttpServer())
    .post('/api/reservations/pay-at-property')
    .set('Origin', origin)
    .send(input(email));
}

async function book() {
  const response =
    await publicBooking().expect(201);

  return prisma.reservation.findUniqueOrThrow({
    where: {
      reservationNumber:
        response.body.data.reservationNumber,
    },
  });
}

async function privateCookie(
  reference: string,
) {
  await request(app.getHttpServer())
    .post('/api/reservations/access/request')
    .set('Origin', origin)
    .send({
      reservationNumber: reference,
      email: 'guest@example.test',
    })
    .expect(202);

  // Drain mocked delivery. No real SMTP is used.
  await access.onModuleDestroy();

  expect(delivered).toHaveLength(1);

  const response =
    await request(app.getHttpServer())
      .post('/api/reservations/access/exchange')
      .set('Origin', origin)
      .send({
        token: delivered[0].token,
      })
      .expect(200);

  const cookies =
    response.headers[
      'set-cookie'
    ] as unknown as string[];

  return cookies[0].split(';')[0];
}

async function view(
  cookie: string,
  query = '',
) {
  return request(app.getHttpServer())
    .get(
      `/api/reservations/access/current${query}`,
    )
    .set('Cookie', cookie)
    .expect(200);
}

async function assign(id: string) {
  const response =
    await request(app.getHttpServer())
      .post(
        `/api/reservations/${id}/assignments`,
      )
      .set('Authorization', bearer())
      .send({ roomId })
      .expect(201);

  return response.body.data.id as string;
}

function stay(
  id: string,
  assignmentId: string,
  operation: 'check-in' | 'check-out',
) {
  return request(app.getHttpServer())
    .post(
      `/api/reservations/${id}/${operation}`,
    )
    .set('Authorization', bearer())
    .send({
      assignmentId,
      ...(operation === 'check-in'
        ? {
            identityVerified: true,
          }
        : {}),
    });
}

async function recordedPayment(id: string) {
  // Synthetic fixture only.
  // This does not implement payment recording.
  return prisma.payment.create({
    data: {
      reservationId: id,
      method: 'PAY_AT_PROPERTY',
      status: 'PAID',
      amountCentavos: 750_000,
      paidAt: new Date(Date.now() - 1000),
    },
  });
}

function otherClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: `file:${resolve(
        directory,
        'journeys.test.db',
      ).replaceAll('\\', '/')}`,
      timeout: 0,
    }),
  });
}

function acquirer(client: PrismaClient) {
  return new ReservationAcquisitionService(
    client as PrismaService,
    new ReservationValidationService(
      client as PrismaService,
      new RoomRateCapacityService(),
    ),
  );
}

async function expiredAssignedHold() {
  const hold = await acquisition.acquire(
    input(),
    'HOLD',
  );

  // Model a legacy pending assignment.
  // The staff assignment API only permits CONFIRMED.
  const assignment =
    await prisma.roomAssignment.create({
      data: {
        reservationId: hold.id,
        roomId,
      },
    });

  await prisma.reservation.update({
    where: {
      id: hold.id,
    },
    data: {
      holdExpiresAt: new Date(
        Date.now() - 1000,
      ),
    },
  });

  return {
    hold,
    assignment,
  };
}

describe(
  'Step 10 — reservation journeys across feature boundaries',
  () => {
    beforeEach(async () => {
      vi.stubEnv(
        'JWT_ACCESS_SECRET',
        secret,
      );
      vi.stubEnv(
        'AUTH_ALLOWED_ORIGINS',
        origin,
      );
      vi.stubEnv('NODE_ENV', 'test');

      delivered = [];

      directory = mkdtempSync(
        resolve(
          process.cwd(),
          '.phase6-journeys-',
        ),
      );

      prisma = otherClient();
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

      roomTypeId = (
        await prisma.roomType.create({
          data: {
            propertyId: property.id,
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

      for (const name of [
        'MANAGER',
        'GUEST',
      ]) {
        const role =
          await prisma.role.create({
            data: { name },
          });

        const user =
          await prisma.user.create({
            data: {
              roleId: role.id,
              name: 'Test',
              email: `${name}@example.test`,
              passwordHash: 'test-only',
              status: 'ACTIVE',
            },
          });

        if (name === 'MANAGER') {
          staff = {
            id: user.id,
            email: user.email,
            role: name,
          };
        } else {
          guestUserId = user.id;
        }
      }

      const module =
        await Test.createTestingModule({
          imports: [
            ReservationsModule,
            RoomsModule,
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
          .overrideProvider(
            BookingAccessEmailService,
          )
          .useValue({
            send: async (
              email: string,
              token: string,
            ) => {
              delivered.push({
                email,
                token,
              });
            },
          })
          .compile();

      jwt = module.get(JwtService);

      access = module.get(
        BookingAccessService,
      );

      acquisition = module.get(
        ReservationAcquisitionService,
      );

      lifecycle = module.get(
        ReservationLifecycleService,
      );

      stays = module.get(
        ReservationStayService,
      );

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
            '.phase6-journeys-',
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
      'keeps a real private session read-only and shows staff cancellation with the original prices',
      async () => {
        const booking = await book();

        const cookie =
          await privateCookie(
            booking.reservationNumber,
          );

        const assignmentId =
          await assign(booking.id);

        expect(
          (
            await stay(
              booking.id,
              assignmentId,
              'check-in',
            )
          ).status,
        ).toBe(409);

        const forbiddenOperations = [
          [
            'cancel',
            {
              reason: 'Guest request',
            },
          ],
          [
            'check-in',
            {
              assignmentId,
              identityVerified: true,
            },
          ],
          [
            'check-out',
            { assignmentId },
          ],
          [
            'assignments',
            { roomId },
          ],
        ] as const;

        for (
          const [operation, body]
          of forbiddenOperations
        ) {
          await request(app.getHttpServer())
            .post(
              `/api/reservations/${booking.id}/${operation}`,
            )
            .set('Cookie', cookie)
            .send(body)
            .expect(401);
        }

        await request(app.getHttpServer())
          .post(
            `/api/reservations/${booking.id}/cancel`,
          )
          .set(
            'Authorization',
            bearer(guestUserId),
          )
          .send({
            reason: 'Guest request',
          })
          .expect(403);

        await prisma.roomType.update({
          where: { id: roomTypeId },
          data: {
            baseRateCentavos: 300_000,
          },
        });

        await request(app.getHttpServer())
          .post(
            `/api/reservations/${booking.id}/cancel`,
          )
          .set('Authorization', bearer())
          .send({
            reason:
              'Guest requested cancellation',
          })
          .expect(200);

        const replacement =
          await publicBooking(
            'other@example.test',
          ).expect(201);

        expect(
          replacement.body.data
            .totalAmountCentavos,
        ).toBe(900_000);

        const other =
          await prisma.reservation.findUniqueOrThrow({
            where: {
              reservationNumber:
                replacement.body.data
                  .reservationNumber,
            },
          });

        const current = await view(
          cookie,
          `?reservationId=${other.id}`,
        );

        expect(
          current.headers['cache-control'],
        ).toBe('no-store');

        expect(
          current.body.data
            .reservationNumber,
        ).toBe(
          booking.reservationNumber,
        );

        expect(
          current.body.data.status,
        ).toBe('CANCELLED');

        expect(
          current.body.data
            .nightlyRateCentavos,
        ).toBe(250_000);

        expect(
          current.body.data
            .totalAmountCentavos,
        ).toBe(750_000);

        for (const field of [
          'id',
          'guestId',
          'roomTypeId',
          'roomId',
          'payments',
          'roomAssignments',
          'accessTokens',
        ]) {
          expect(
            current.body.data,
          ).not.toHaveProperty(field);
        }

        expect(
          current.body.data.guest,
        ).not.toHaveProperty('email');

        const released =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignmentId },
          });

        expect(
          released.releasedAt,
        ).not.toBeNull();

        expect(
          await prisma.payment.count(),
        ).toBe(0);

        expect(
          await prisma.refund.count(),
        ).toBe(0);

        expect(
          await prisma.auditLog.count({
            where: {
              action:
                'reservation.cancelled',
              entityId: booking.id,
            },
          }),
        ).toBe(1);
      },
    );

    it(
      'requires checkout and cleaning before the same room can admit the next same-day booking',
      async () => {
        const booking = await book();

        const cookie =
          await privateCookie(
            booking.reservationNumber,
          );

        const assignmentId =
          await assign(booking.id);

        const payment =
          await recordedPayment(
            booking.id,
          );

        await stay(
          booking.id,
          assignmentId,
          'check-in',
        ).expect(200);

        expect(
          (
            await view(cookie)
          ).body.data.status,
        ).toBe('CHECKED_IN');

        await request(app.getHttpServer())
          .patch(
            `/api/rooms/${roomId}/status`,
          )
          .set('Authorization', bearer())
          .send({
            status: 'READY',
          })
          .expect(409);

        await stay(
          booking.id,
          assignmentId,
          'check-out',
        ).expect(200);

        const dirtyRoom =
          await prisma.room.findUniqueOrThrow({
            where: { id: roomId },
          });

        expect(
          dirtyRoom.status,
        ).toBe('CLEANING');

        await publicBooking(
          'next@example.test',
        ).expect(409);

        expect(
          await prisma.guest.count(),
        ).toBe(1);

        await request(app.getHttpServer())
          .patch(
            `/api/rooms/${roomId}/status`,
          )
          .set('Authorization', bearer())
          .send({
            status: 'READY',
          })
          .expect(200);

        const next =
          await publicBooking(
            'next@example.test',
          ).expect(201);

        const nextBooking =
          await prisma.reservation.findUniqueOrThrow({
            where: {
              reservationNumber:
                next.body.data
                  .reservationNumber,
            },
          });

        const nextAssignment =
          await assign(nextBooking.id);

        await recordedPayment(
          nextBooking.id,
        );

        await stay(
          nextBooking.id,
          nextAssignment,
          'check-in',
        ).expect(200);

        const original = (
          await view(cookie)
        ).body.data;

        expect(
          original.status,
        ).toBe('CHECKED_OUT');

        expect(
          original.totalAmountCentavos,
        ).toBe(750_000);

        expect(
          await prisma.payment.findUniqueOrThrow({
            where: { id: payment.id },
          }),
        ).toEqual(payment);

        expect(
          await prisma.refund.count(),
        ).toBe(0);

        expect(
          await prisma.roomAssignment.count({
            where: {
              roomId,
              releasedAt: null,
            },
          }),
        ).toBe(1);

        const previous =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignmentId },
          });

        expect(
          previous.releasedAt,
        ).not.toBeNull();

        const occupiedRoom =
          await prisma.room.findUniqueOrThrow({
            where: { id: roomId },
          });

        expect(
          occupiedRoom.status,
        ).toBe('OCCUPIED');
      },
    );

    it(
      'expires an assigned hold exactly once while competing clients acquire its single room',
      async () => {
        const {
          hold,
          assignment,
        } = await expiredAssignedHold();

        await prisma.roomType.update({
          where: { id: roomTypeId },
          data: {
            baseRateCentavos: 275_000,
          },
        });

        const other = otherClient();

        try {
          const results =
            await Promise.allSettled([
              acquisition.acquire(
                input('first@example.test'),
                'CONFIRMED',
              ),

              acquirer(other).acquire(
                input('second@example.test'),
                'CONFIRMED',
              ),

              lifecycle.expireHolds(staff),
            ]);

          const competing =
            results.slice(0, 2);

          expect(
            competing.filter(
              (result) =>
                result.status === 'fulfilled',
            ),
          ).toHaveLength(1);

          const rejected = competing.find(
            (result) =>
              result.status === 'rejected',
          );

          expect(
            rejected?.status === 'rejected' &&
              rejected.reason instanceof
                ConflictException,
          ).toBe(true);

          expect(
            results[2].status,
          ).toBe('fulfilled');

          const expired =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: hold.id },
            });

          expect(
            expired.status,
          ).toBe('EXPIRED');

          expect(
            expired.totalAmountCentavos,
          ).toBe(750_000);

          const released =
            await prisma.roomAssignment.findUniqueOrThrow({
              where: { id: assignment.id },
            });

          expect(
            released.releasedAt,
          ).not.toBeNull();

          const winner =
            await prisma.reservation.findFirstOrThrow({
              where: {
                status: 'CONFIRMED',
              },
            });

          expect(
            winner.nightlyRateCentavos,
          ).toBe(275_000);

          expect(
            winner.totalAmountCentavos,
          ).toBe(825_000);

          expect(
            await prisma.reservation.count(),
          ).toBe(2);

          expect(
            await prisma.guest.count(),
          ).toBe(2);

          expect(
            await prisma.auditLog.count({
              where: {
                action:
                  'reservation.hold_expired',
                entityId: hold.id,
              },
            }),
          ).toBe(1);

          expect(
            await prisma.auditLog.count({
              where: {
                action:
                  'reservation.cancellation_policy_recorded',
              },
            }),
          ).toBe(2);
        } finally {
          await other.$disconnect();
        }
      },
    );

    it(
      'rolls expiration and assignment release back when acquiring the replacement fails',
      async () => {
        const {
          hold,
          assignment,
        } = await expiredAssignedHold();

        const cookie =
          await privateCookie(
            hold.reservationNumber,
          );

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_replacement_policy
          BEFORE INSERT ON "AuditLog"
          WHEN NEW.action =
            'reservation.cancellation_policy_recorded'
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only replacement failure'
            );
          END
        `);

        await expect(
          acquisition.acquire(
            input(
              'replacement@example.test',
            ),
            'CONFIRMED',
          ),
        ).rejects.toThrow();

        expect(
          (
            await view(cookie)
          ).body.data.status,
        ).toBe('PENDING');

        const preserved =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignment.id },
          });

        expect(
          preserved.releasedAt,
        ).toBeNull();

        expect(
          await prisma.reservation.count(),
        ).toBe(1);

        expect(
          await prisma.guest.count(),
        ).toBe(1);

        expect(
          await prisma.auditLog.count({
            where: {
              action:
                'reservation.hold_expired',
            },
          }),
        ).toBe(0);

        expect(
          await prisma.auditLog.count({
            where: {
              action:
                'reservation.cancellation_policy_recorded',
            },
          }),
        ).toBe(1);
      },
    );

    it(
      'keeps the private view and occupied room consistent when checkout fails, then permits a retry',
      async () => {
        const booking = await book();

        const cookie =
          await privateCookie(
            booking.reservationNumber,
          );

        const assignmentId =
          await assign(booking.id);

        const payment =
          await recordedPayment(
            booking.id,
          );

        await stay(
          booking.id,
          assignmentId,
          'check-in',
        ).expect(200);

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_journey_checkout
          BEFORE INSERT ON "AuditLog"
          WHEN NEW.action =
            'reservation.checked_out'
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only checkout failure'
            );
          END
        `);

        await expect(
          stays.checkOut(
            booking.id,
            assignmentId,
            staff,
          ),
        ).rejects.toThrow();

        expect(
          (
            await view(cookie)
          ).body.data.status,
        ).toBe('CHECKED_IN');

        const room =
          await prisma.room.findUniqueOrThrow({
            where: { id: roomId },
          });

        expect(
          room.status,
        ).toBe('OCCUPIED');

        const assignment =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignmentId },
          });

        expect(
          assignment.releasedAt,
        ).toBeNull();

        expect(
          await prisma.auditLog.count({
            where: {
              action:
                'reservation.checked_out',
            },
          }),
        ).toBe(0);

        await prisma.$executeRawUnsafe(
          'DROP TRIGGER reject_journey_checkout',
        );

        await stay(
          booking.id,
          assignmentId,
          'check-out',
        ).expect(200);

        expect(
          (
            await view(cookie)
          ).body.data.status,
        ).toBe('CHECKED_OUT');

        expect(
          await prisma.payment.findUniqueOrThrow({
            where: { id: payment.id },
          }),
        ).toEqual(payment);

        expect(
          await prisma.auditLog.count({
            where: {
              action:
                'reservation.checked_out',
            },
          }),
        ).toBe(1);
      },
    );

    it(
      'serializes cancellation against replacement acquisition without leaking inventory or guest rows',
      async () => {
        const booking = await book();

        const assignmentId =
          await assign(booking.id);

        const other = otherClient();

        try {
          const replacementAcquirer =
            acquirer(other);

          const results =
            await Promise.allSettled([
              request(app.getHttpServer())
                .post(
                  `/api/reservations/${booking.id}/cancel`,
                )
                .set(
                  'Authorization',
                  bearer(),
                )
                .send({
                  reason:
                    'Guest requested cancellation',
                })
                .expect(200),

              replacementAcquirer.acquire(
                input(
                  'replacement@example.test',
                ),
                'CONFIRMED',
              ),
            ]);

          expect(
            results[0].status,
          ).toBe('fulfilled');

          if (
            results[1].status === 'rejected'
          ) {
            expect(
              results[1].reason,
            ).toBeInstanceOf(
              ConflictException,
            );

            await replacementAcquirer.acquire(
              input(
                'replacement@example.test',
              ),
              'CONFIRMED',
            );
          }

          const cancelled =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: booking.id },
            });

          expect(
            cancelled.status,
          ).toBe('CANCELLED');

          const released =
            await prisma.roomAssignment.findUniqueOrThrow({
              where: { id: assignmentId },
            });

          expect(
            released.releasedAt,
          ).not.toBeNull();

          expect(
            await prisma.reservation.count({
              where: {
                status: 'CONFIRMED',
              },
            }),
          ).toBe(1);

          expect(
            await prisma.reservation.count(),
          ).toBe(2);

          expect(
            await prisma.guest.count(),
          ).toBe(2);

          expect(
            await prisma.auditLog.count({
              where: {
                action:
                  'reservation.cancelled',
              },
            }),
          ).toBe(1);

          expect(
            await prisma.payment.count(),
          ).toBe(0);
        } finally {
          await other.$disconnect();
        }
      },
    );
  },
);