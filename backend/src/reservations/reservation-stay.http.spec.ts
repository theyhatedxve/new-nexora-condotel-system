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
  InventorySafetyService,
} from '../common/inventory/inventory-safety.service.js';
import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  ReservationsModule,
} from './reservations.module.js';
import {
  ReservationStayService,
} from './reservation-stay.service.js';
import {
  RoomAssignmentsService,
} from './room-assignments.service.js';
import {
  ReservationCancellationService,
} from './reservation-cancellation.service.js';

const secret =
  'isolated-stay-test-secret-with-at-least-32-bytes';

let app: INestApplication;
let directory: string;
let prisma: PrismaClient;
let jwt: JwtService;

let stays: ReservationStayService;
let inventory: InventorySafetyService;
let assignments: RoomAssignmentsService;
let cancellation: ReservationCancellationService;

let propertyId: string;
let roomTypeId: string;
let roomId: string;
let secondRoomId: string;
let bookingId: string;
let assignmentId: string;

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

function bearer(role = 'MANAGER') {
  return `Bearer ${jwt.sign({
    sub: users[role].id,
    jti: randomUUID(),
  })}`;
}

function post(
  operation = 'check-in',
  body: object = {
    assignmentId,
    identityVerified: true,
  },
  role = 'MANAGER',
) {
  return request(app.getHttpServer())
    .post(
      `/api/reservations/${bookingId}/${operation}`,
    )
    .set('Authorization', bearer(role))
    .send(body);
}

async function paid(
  amountCentavos = 750_000,
) {
  return prisma.payment.create({
    data: {
      reservationId: bookingId,
      method: 'PAY_AT_PROPERTY',
      status: 'PAID',
      amountCentavos,
      paidAt: new Date(Date.now() - 1000),
    },
  });
}

async function checkedIn() {
  await paid();

  await stays.checkIn(
    bookingId,
    assignmentId,
    true,
    users.MANAGER,
  );
}

function otherClient() {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: `file:${resolve(
        directory,
        'stay.test.db',
      ).replaceAll('\\', '/')}`,
      timeout: 0,
    }),
  });
}

async function assertState(
  status: string,
  roomStatus: string,
  released: boolean,
) {
  const booking =
    await prisma.reservation.findUniqueOrThrow({
      where: { id: bookingId },
    });

  const room =
    await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
    });

  const assignment =
    await prisma.roomAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
    });

  expect(booking.status).toBe(status);
  expect(room.status).toBe(roomStatus);

  expect(
    assignment.releasedAt !== null,
  ).toBe(released);
}

describe(
  'Step 9 — check-in and check-out with Policy A',
  () => {
    beforeEach(async () => {
      vi.stubEnv('JWT_ACCESS_SECRET', secret);

      directory = mkdtempSync(
        resolve(
          process.cwd(),
          '.phase6-stay-',
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

      roomId = (
        await prisma.room.create({
          data: {
            roomTypeId,
            roomNumber: '101',
          },
        })
      ).id;

      secondRoomId = (
        await prisma.room.create({
          data: {
            roomTypeId,
            roomNumber: '102',
          },
        })
      ).id;

      const guest =
        await prisma.guest.create({
          data: {
            firstName: 'Test',
            lastName: 'Guest',
            email: 'guest@example.test',
          },
        });

      bookingId = (
        await prisma.reservation.create({
          data: {
            reservationNumber:
              `NX-${randomUUID()}`,
            guestId: guest.id,
            roomTypeId,
            status: 'CONFIRMED',
            checkInDate: date(0),
            checkOutDate: date(3),
            guestCount: 2,
            nightlyRateCentavos: 250_000,
            totalAmountCentavos: 750_000,
          },
        })
      ).id;

      assignmentId = (
        await prisma.roomAssignment.create({
          data: {
            reservationId: bookingId,
            roomId,
          },
        })
      ).id;

      users = {};

      for (const name of [
        'ADMIN',
        'MANAGER',
        'RECEPTIONIST',
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

      stays = module.get(
        ReservationStayService,
      );

      inventory = module.get(
        InventorySafetyService,
      );

      assignments = module.get(
        RoomAssignmentsService,
      );

      cancellation = module.get(
        ReservationCancellationService,
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
            '.phase6-stay-',
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
      'requires staff JWTs for both operations',
      async () => {
        for (const operation of [
          'check-in',
          'check-out',
        ]) {
          await request(app.getHttpServer())
            .post(
              `/api/reservations/${bookingId}/${operation}`,
            )
            .set(
              'Cookie',
              'nexora_booking_access=fake',
            )
            .send({
              assignmentId,
              identityVerified: true,
            })
            .expect(401);

          const guestResult = await post(
            operation,
            {
              assignmentId,
              identityVerified: true,
            },
            'GUEST',
          );

          expect(
            guestResult.status,
          ).toBe(403);
        }

        await prisma.user.update({
          where: {
            id: users.MANAGER.id,
          },
          data: {
            status: 'DISABLED',
          },
        });

        expect(
          (await post()).status,
        ).toBe(401);

        await assertState(
          'CONFIRMED',
          'READY',
          false,
        );
      },
    );

    for (const role of [
      'ADMIN',
      'MANAGER',
      'RECEPTIONIST',
    ]) {
      it(
        `allows ${role} to complete and audit a paid stay`,
        async () => {
          const payment = await paid();

          const before =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          const checkIn = await post(
            'check-in',
            {
              assignmentId,
              identityVerified: true,
            },
            role,
          );

          expect(checkIn.status).toBe(200);

          expect(
            checkIn.headers['cache-control'],
          ).toBe('no-store');

          expect(
            checkIn.body.data,
          ).toEqual({
            reservationNumber:
              before.reservationNumber,
            status: 'CHECKED_IN',
            alreadyProcessed: false,
          });

          await assertState(
            'CHECKED_IN',
            'OCCUPIED',
            false,
          );

          const checkout = await post(
            'check-out',
            { assignmentId },
            role,
          );

          expect(checkout.status).toBe(200);

          await assertState(
            'CHECKED_OUT',
            'CLEANING',
            true,
          );

          expect(
            await prisma.payment.findUniqueOrThrow({
              where: { id: payment.id },
            }),
          ).toEqual(payment);

          expect(
            await prisma.refund.count(),
          ).toBe(0);

          const after =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          expect(
            after.totalAmountCentavos,
          ).toBe(
            before.totalAmountCentavos,
          );

          expect(
            after.nightlyRateCentavos,
          ).toBe(
            before.nightlyRateCentavos,
          );

          expect(
            after.checkOutDate,
          ).toEqual(before.checkOutDate);

          expect(
            await prisma.guest.count(),
          ).toBe(1);

          const events =
            await prisma.auditLog.findMany({
              orderBy: {
                createdAt: 'asc',
              },
            });

          expect(
            events.map(
              (event) => event.action,
            ),
          ).toEqual([
            'reservation.checked_in',
            'reservation.checked_out',
          ]);

          expect(
            events.every(
              (event) =>
                event.actorUserId ===
                users[role].id,
            ),
          ).toBe(true);

          expect(
            JSON.parse(
              events[0].detailsJson!,
            ).identityVerified,
          ).toBe(true);

          const history =
            await prisma.roomAssignment.findUniqueOrThrow({
              where: { id: assignmentId },
            });

          expect(
            history.releasedAt,
          ).toEqual(events[1].createdAt);
        },
      );
    }

    it(
      'blocks an unpaid reservation without creating a payment',
      async () => {
        expect(
          (await post()).status,
        ).toBe(409);

        await assertState(
          'CONFIRMED',
          'READY',
          false,
        );

        expect(
          await prisma.payment.count(),
        ).toBe(0);

        expect(
          await prisma.auditLog.count(),
        ).toBe(0);
      },
    );

    for (const status of [
      'UNPAID',
      'PENDING',
      'FAILED',
      'PARTIALLY_PAID',
      'PARTIALLY_REFUNDED',
      'REFUNDED',
    ] as const) {
      it(
        `does not treat a ${status} payment as full payment`,
        async () => {
          await prisma.payment.create({
            data: {
              reservationId: bookingId,
              method: 'PAY_AT_PROPERTY',
              status,
              amountCentavos: 750_000,
            },
          });

          expect(
            (await post()).status,
          ).toBe(409);

          await assertState(
            'CONFIRMED',
            'READY',
            false,
          );
        },
      );
    }

    it(
      'requires enough completed payments and accepts split completed receipts',
      async () => {
        await paid(500_000);

        expect(
          (await post()).status,
        ).toBe(409);

        await paid(250_000);

        expect(
          (await post()).status,
        ).toBe(200);
      },
    );

    for (const invalid of [
      'MISSING_DATE',
      'FUTURE_DATE',
      'CURRENCY',
      'ZERO',
      'PROVIDER',
      'PAYMONGO',
      'REFUND',
    ] as const) {
      it(
        `requires review of a paid record with ${invalid}`,
        async () => {
          const payment = await paid();

          if (invalid === 'MISSING_DATE') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { paidAt: null },
            });
          }

          if (invalid === 'FUTURE_DATE') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { paidAt: date(2) },
            });
          }

          if (invalid === 'CURRENCY') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { currency: 'USD' },
            });
          }

          if (invalid === 'ZERO') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { amountCentavos: 0 },
            });
          }

          if (invalid === 'PROVIDER') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                providerPaymentId:
                  'test-provider-id',
              },
            });
          }

          if (invalid === 'PAYMONGO') {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                method: 'PAYMONGO',
              },
            });
          }

          if (invalid === 'REFUND') {
            await prisma.refund.create({
              data: {
                paymentId: payment.id,
                amountCentavos: 1,
                reason: 'Test',
                status: 'PENDING',
              },
            });
          }

          expect(
            (await post()).status,
          ).toBe(409);

          await assertState(
            'CONFIRMED',
            'READY',
            false,
          );
        },
      );
    }

    it(
      'rejects missing identity attestation and client-supplied privileged fields',
      async () => {
        await paid();

        const invalidInputs = [
          { assignmentId },
          {
            assignmentId,
            identityVerified: false,
          },
          {
            assignmentId,
            identityVerified: 'true',
          },
          {
            assignmentId,
            identityVerified: true,
            paid: true,
          },
          {
            assignmentId,
            identityVerified: true,
            status: 'CHECKED_IN',
          },
          {
            assignmentId,
            identityVerified: true,
            actorUserId: users.ADMIN.id,
          },
        ];

        for (const body of invalidInputs) {
          expect(
            (
              await post(
                'check-in',
                body,
              )
            ).status,
          ).toBe(400);
        }

        expect(
          (
            await post(
              'check-out',
              {
                assignmentId,
                paid: true,
              },
            )
          ).status,
        ).toBe(400);

        await assertState(
          'CONFIRMED',
          'READY',
          false,
        );
      },
    );

    for (const status of [
      'PENDING',
      'CANCELLED',
      'EXPIRED',
      'CHECKED_OUT',
    ] as const) {
      it(
        `rejects check-in from ${status}`,
        async () => {
          await paid();

          await prisma.reservation.update({
            where: { id: bookingId },
            data: { status },
          });

          expect(
            (await post()).status,
          ).toBe(409);
        },
      );
    }

    for (const start of [1, -3]) {
      it(
        `rejects check-in outside stay dates (${start})`,
        async () => {
          await paid();

          await prisma.reservation.update({
            where: { id: bookingId },
            data: {
              checkInDate: date(start),
              checkOutDate: date(start + 3),
            },
          });

          expect(
            (await post()).status,
          ).toBe(409);
        },
      );
    }

    for (const status of [
      'CLEANING',
      'OCCUPIED',
      'MAINTENANCE',
      'OUT_OF_SERVICE',
    ] as const) {
      it(
        `rejects check-in when the room is ${status}`,
        async () => {
          await paid();

          await prisma.room.update({
            where: { id: roomId },
            data: { status },
          });

          expect(
            (await post()).status,
          ).toBe(409);
        },
      );
    }

    it(
      'rejects inactive rooms, inactive types and insufficient capacity',
      async () => {
        await paid();

        await prisma.room.update({
          where: { id: roomId },
          data: { isActive: false },
        });

        expect(
          (await post()).status,
        ).toBe(409);

        await prisma.room.update({
          where: { id: roomId },
          data: { isActive: true },
        });

        await prisma.roomType.update({
          where: { id: roomTypeId },
          data: { isActive: false },
        });

        expect(
          (await post()).status,
        ).toBe(409);

        await prisma.roomType.update({
          where: { id: roomTypeId },
          data: {
            isActive: true,
            capacity: 1,
          },
        });

        expect(
          (await post()).status,
        ).toBe(400);
      },
    );

    it(
      'rejects a blocked room and preserves assignment history',
      async () => {
        await paid();

        await prisma.roomBlock.create({
          data: {
            roomId,
            startDate: date(0),
            endDate: date(1),
            reason: 'Test',
          },
        });

        expect(
          (await post()).status,
        ).toBe(409);

        await assertState(
          'CONFIRMED',
          'READY',
          false,
        );
      },
    );

    it(
      'requires exactly one matching active assignment',
      async () => {
        await paid();

        expect(
          (
            await post(
              'check-in',
              {
                assignmentId: 'stale',
                identityVerified: true,
              },
            )
          ).status,
        ).toBe(409);

        await prisma.roomAssignment.update({
          where: { id: assignmentId },
          data: {
            releasedAt: new Date(),
          },
        });

        expect(
          (await post()).status,
        ).toBe(409);

        await prisma.roomAssignment.update({
          where: { id: assignmentId },
          data: { releasedAt: null },
        });

        await prisma.roomAssignment.create({
          data: {
            reservationId: bookingId,
            roomId: secondRoomId,
          },
        });

        expect(
          (await post()).status,
        ).toBe(409);
      },
    );

    it(
      'blocks an overlapping assignment and an overdue checked-in occupant',
      async () => {
        await paid();

        const booking =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        const other =
          await prisma.reservation.create({
            data: {
              guestId: booking.guestId,
              roomTypeId,
              reservationNumber:
                `NX-${randomUUID()}`,
              status: 'CONFIRMED',
              checkInDate: date(0),
              checkOutDate: date(1),
              guestCount: 1,
              nightlyRateCentavos: 1,
              totalAmountCentavos: 1,
            },
          });

        await prisma.roomAssignment.create({
          data: {
            reservationId: other.id,
            roomId,
          },
        });

        expect(
          (await post()).status,
        ).toBe(409);

        await prisma.reservation.update({
          where: { id: other.id },
          data: {
            status: 'CHECKED_IN',
            checkInDate: date(-3),
            checkOutDate: date(0),
          },
        });

        expect(
          (await post()).status,
        ).toBe(409);
      },
    );

    it(
      'blocks unreleased NFC assignments without pretending to revoke access',
      async () => {
        await paid();

        const card =
          await prisma.nfcCard.create({
            data: {
              cardIdentifier: 'test-card',
            },
          });

        const credential =
          await prisma.nfcCredential.create({
            data: {
              cardId: card.id,
              credentialReference:
                'test-ref',
            },
          });

        const cardAssignment =
          await prisma.cardAssignment.create({
            data: {
              credentialId: credential.id,
              reservationId: bookingId,
              roomId,
              validFrom: date(0),
              validUntil: date(3),
            },
          });

        expect(
          (await post()).status,
        ).toBe(409);

        // Synthetic fixture change only.
        await prisma.cardAssignment.update({
          where: {
            id: cardAssignment.id,
          },
          data: {
            revokedAt: new Date(),
          },
        });

        await stays.checkIn(
          bookingId,
          assignmentId,
          true,
          users.MANAGER,
        );

        await prisma.cardAssignment.update({
          where: {
            id: cardAssignment.id,
          },
          data: {
            revokedAt: null,
          },
        });

        expect(
          (
            await post(
              'check-out',
              { assignmentId },
            )
          ).status,
        ).toBe(409);

        const stored =
          await prisma.cardAssignment.findUniqueOrThrow({
            where: {
              id: cardAssignment.id,
            },
          });

        expect(
          stored.revokedAt,
        ).toBeNull();

        await assertState(
          'CHECKED_IN',
          'OCCUPIED',
          false,
        );
      },
    );

    it(
      'does not check out a reservation that has not checked in',
      async () => {
        await paid();

        expect(
          (
            await post(
              'check-out',
              { assignmentId },
            )
          ).status,
        ).toBe(409);
      },
    );

    it(
      'rechecks payment before checkout and leaves changed finances untouched',
      async () => {
        await checkedIn();

        await prisma.payment.updateMany({
          data: {
            status: 'REFUNDED',
          },
        });

        expect(
          (
            await post(
              'check-out',
              { assignmentId },
            )
          ).status,
        ).toBe(409);

        await assertState(
          'CHECKED_IN',
          'OCCUPIED',
          false,
        );
      },
    );

    it(
      'rejects checkout from an inconsistent room state',
      async () => {
        await checkedIn();

        await prisma.room.update({
          where: { id: roomId },
          data: { status: 'READY' },
        });

        expect(
          (
            await post(
              'check-out',
              { assignmentId },
            )
          ).status,
        ).toBe(409);
      },
    );

    it(
      'allows departure on or after the planned checkout date without changing the booked dates',
      async () => {
        await checkedIn();

        await prisma.reservation.update({
          where: { id: bookingId },
          data: {
            checkInDate: date(-4),
            checkOutDate: date(-1),
          },
        });

        expect(
          (
            await post(
              'check-out',
              { assignmentId },
            )
          ).status,
        ).toBe(200);

        await assertState(
          'CHECKED_OUT',
          'CLEANING',
          true,
        );

        const stored =
          await prisma.reservation.findUniqueOrThrow({
            where: { id: bookingId },
          });

        expect(
          stored.checkOutDate,
        ).toEqual(date(-1));
      },
    );

    it(
      'makes retries idempotent and never resets a cleaned room on a checkout retry',
      async () => {
        await checkedIn();

        expect(
          (await post()).body.data
            .alreadyProcessed,
        ).toBe(true);

        expect(
          (
            await post(
              'check-out',
              { assignmentId },
            )
          ).status,
        ).toBe(200);

        const released =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignmentId },
          });

        await prisma.room.update({
          where: { id: roomId },
          data: { status: 'READY' },
        });

        const retry = await post(
          'check-out',
          { assignmentId },
        );

        expect(
          retry.body.data.alreadyProcessed,
        ).toBe(true);

        const room =
          await prisma.room.findUniqueOrThrow({
            where: { id: roomId },
          });

        expect(room.status).toBe('READY');

        const preserved =
          await prisma.roomAssignment.findUniqueOrThrow({
            where: { id: assignmentId },
          });

        expect(
          preserved.releasedAt,
        ).toEqual(released.releasedAt);

        expect(
          await prisma.auditLog.count(),
        ).toBe(2);

        expect(
          (
            await post(
              'check-out',
              {
                assignmentId: 'stale',
              },
            )
          ).status,
        ).toBe(409);
      },
    );

    it(
      'does not acknowledge a legacy status as a completed operation without its audit event',
      async () => {
        await prisma.reservation.update({
          where: { id: bookingId },
          data: {
            status: 'CHECKED_IN',
          },
        });

        expect(
          (await post()).status,
        ).toBe(409);
      },
    );

    for (const operation of [
      'check-in',
      'check-out',
    ]) {
      it(
        `rolls back every ${operation} change if its audit insert fails`,
        async () => {
          if (operation === 'check-in') {
            await paid();
          } else {
            await checkedIn();
          }

          const action =
            operation === 'check-in'
              ? 'reservation.checked_in'
              : 'reservation.checked_out';

          await prisma.$executeRawUnsafe(`
            CREATE TRIGGER reject_stay_audit
            BEFORE INSERT ON "AuditLog"
            WHEN NEW.action = '${action}'
            BEGIN
              SELECT RAISE(
                ABORT,
                'test-only failure'
              );
            END
          `);

          const work =
            operation === 'check-in'
              ? stays.checkIn(
                  bookingId,
                  assignmentId,
                  true,
                  users.MANAGER,
                )
              : stays.checkOut(
                  bookingId,
                  assignmentId,
                  users.MANAGER,
                );

          await expect(
            work,
          ).rejects.toThrow();

          await assertState(
            operation === 'check-in'
              ? 'CONFIRMED'
              : 'CHECKED_IN',
            operation === 'check-in'
              ? 'READY'
              : 'OCCUPIED',
            false,
          );

          expect(
            await prisma.auditLog.count({
              where: { action },
            }),
          ).toBe(0);
        },
      );
    }

    it(
      'rolls back checkout when assignment release fails',
      async () => {
        await checkedIn();

        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER reject_stay_release
          BEFORE UPDATE ON "RoomAssignment"
          BEGIN
            SELECT RAISE(
              ABORT,
              'test-only release failure'
            );
          END
        `);

        await expect(
          stays.checkOut(
            bookingId,
            assignmentId,
            users.MANAGER,
          ),
        ).rejects.toThrow();

        await assertState(
          'CHECKED_IN',
          'OCCUPIED',
          false,
        );
      },
    );

    for (const operation of [
      'check-in',
      'check-out',
    ]) {
      it(
        `performs concurrent ${operation} only once across independent clients`,
        async () => {
          if (operation === 'check-in') {
            await paid();
          } else {
            await checkedIn();
          }

          const other = otherClient();

          // Inventory checks use the transaction
          // passed by the calling stay service.
          const otherStays =
            new ReservationStayService(
              other as PrismaService,
              inventory,
            );

          try {
            const results =
              await Promise.all(
                operation === 'check-in'
                  ? [
                      stays.checkIn(
                        bookingId,
                        assignmentId,
                        true,
                        users.MANAGER,
                      ),
                      otherStays.checkIn(
                        bookingId,
                        assignmentId,
                        true,
                        users.ADMIN,
                      ),
                    ]
                  : [
                      stays.checkOut(
                        bookingId,
                        assignmentId,
                        users.MANAGER,
                      ),
                      otherStays.checkOut(
                        bookingId,
                        assignmentId,
                        users.ADMIN,
                      ),
                    ],
              );

            const retryFlags = results
              .map(
                (result) =>
                  result.alreadyProcessed,
              )
              .sort(
                (a, b) =>
                  Number(a) - Number(b),
              );

            expect(
              retryFlags,
            ).toEqual([false, true]);

            expect(
              await prisma.auditLog.count({
                where: {
                  action:
                    operation === 'check-in'
                      ? 'reservation.checked_in'
                      : 'reservation.checked_out',
                },
              }),
            ).toBe(1);
          } finally {
            await other.$disconnect();
          }
        },
      );
    }

    it(
      'serializes check-in against reassignment without a stale room mutation',
      async () => {
        await paid();

        const other = otherClient();

        try {
          const otherStays =
            new ReservationStayService(
              other as PrismaService,
              inventory,
            );

          const results =
            await Promise.allSettled([
              otherStays.checkIn(
                bookingId,
                assignmentId,
                true,
                users.MANAGER,
              ),

              assignments.reassign(
                bookingId,
                assignmentId,
                secondRoomId,
                users.ADMIN,
              ),
            ]);

          expect(
            results.filter(
              (result) =>
                result.status === 'fulfilled',
            ),
          ).toHaveLength(1);

          const booking =
            await prisma.reservation.findUniqueOrThrow({
              where: { id: bookingId },
            });

          const active =
            await prisma.roomAssignment.findMany({
              where: {
                reservationId: bookingId,
                releasedAt: null,
              },
            });

          expect(active).toHaveLength(1);

          const originalRoom =
            await prisma.room.findUniqueOrThrow({
              where: { id: roomId },
            });

          if (
            booking.status === 'CHECKED_IN'
          ) {
            expect(
              active[0].id,
            ).toBe(assignmentId);

            expect(
              originalRoom.status,
            ).toBe('OCCUPIED');
          } else {
            expect(
              active[0].roomId,
            ).toBe(secondRoomId);

            expect(
              originalRoom.status,
            ).toBe('READY');
          }
        } finally {
          await other.$disconnect();
        }
      },
    );

    it(
      'cannot cancel a checked-in stay or change its assignment through the old operations',
      async () => {
        await checkedIn();

        await expect(
          cancellation.cancel(
            bookingId,
            'Test reason',
            users.MANAGER,
          ),
        ).rejects.toThrow();

        await expect(
          assignments.release(
            bookingId,
            assignmentId,
            users.MANAGER,
          ),
        ).rejects.toThrow();

        await assertState(
          'CHECKED_IN',
          'OCCUPIED',
          false,
        );
      },
    );

    it(
      'returns 404 for an unknown reservation and rejects invalid property configuration',
      async () => {
        await expect(
          stays.checkIn(
            'missing',
            assignmentId,
            true,
            users.MANAGER,
          ),
        ).rejects.toThrow(
          'Reservation not found',
        );

        await prisma.property.create({
          data: {
            name: 'Other',
            address: 'Test',
            city: 'Test',
            province: 'Test',
          },
        });

        await expect(
          stays.checkIn(
            bookingId,
            assignmentId,
            true,
            users.MANAGER,
          ),
        ).rejects.toThrow(
          'Exactly one property',
        );
      },
    );
  },
);