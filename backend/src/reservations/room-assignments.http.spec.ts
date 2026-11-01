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

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

import {
  InventorySafetyService,
} from '../common/inventory/inventory-safety.service.js';

import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import { ReservationsModule } from './reservations.module.js';
import { RoomAssignmentsService } from './room-assignments.service.js';

const secret =
  'isolated-room-assignment-test-secret-at-least-32-bytes';

let directory: string;
let app: INestApplication;
let prisma: PrismaClient;
let jwt: JwtService;
let service: RoomAssignmentsService;

let users: Record<
  string,
  { id: string; email: string; role: string }
>;

let propertyId: string;
let roomTypeId: string;
let guestId: string;
let bookingId: string;
let roomA: string;
let roomB: string;

function date(days: number) {
  return new Date(
    todayInPhilippines().getTime() +
    days * 86_400_000,
  );
}

function endpoint(id = bookingId) {
  return `/api/reservations/${id}/assignments`;
}

function bearer(role = 'MANAGER') {
  return `Bearer ${jwt.sign({
    sub: users[role].id,
    jti: randomUUID(),
  })}`;
}

async function seedBooking(start = 10, end = 13) {
  return prisma.reservation.create({
    data: {
      reservationNumber: `NX-${randomUUID()}`,
      guestId,
      roomTypeId,
      checkInDate: date(start),
      checkOutDate: date(end),
      guestCount: 2,
      nightlyRateCentavos: 250_000,
      totalAmountCentavos:
        (end - start) * 250_000,
      status: 'CONFIRMED',
    },
  });
}

async function assign(
  roomId = roomA,
  id = bookingId,
) {
  return request(app.getHttpServer())
    .post(endpoint(id))
    .set('Authorization', bearer())
    .send({ roomId });
}

describe('Step 6 — staff room assignment history', () => {
  beforeEach(async () => {
    vi.stubEnv('JWT_ACCESS_SECRET', secret);

    directory = mkdtempSync(
      resolve(process.cwd(), '.phase6-assignments-'),
    );

    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: `file:${resolve(
          directory,
          'assignments.test.db',
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

    // Suitable for the current checked-in migrations,
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

    const property = await prisma.property.create({
      data: {
        name: 'Test',
        address: 'Test',
        city: 'Test',
        province: 'Test',
      },
    });

    propertyId = property.id;

    const type = await prisma.roomType.create({
      data: {
        propertyId,
        name: 'Deluxe',
        capacity: 2,
        baseRateCentavos: 250_000,
      },
    });

    roomTypeId = type.id;

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
        },
      })
    ).id;

    bookingId = (await seedBooking()).id;
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
    service = module.get(RoomAssignmentsService);

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
        resolve(root, '.phase6-assignments-'),
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
    'rejects missing authentication and accountless-access cookies',
    async () => {
      await request(app.getHttpServer())
        .get(endpoint())
        .expect(401);

      await request(app.getHttpServer())
        .post(endpoint())
        .set('Cookie', 'nexora_booking_access=fake')
        .send({ roomId: roomA })
        .expect(401);
    },
  );

  it(
    'rejects guest access even if a signed token claims an administrator role',
    async () => {
      const token = jwt.sign({
        sub: users.GUEST.id,
        jti: randomUUID(),
        role: 'ADMIN',
      });

      await request(app.getHttpServer())
        .get(endpoint())
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(
        await prisma.roomAssignment.count(),
      ).toBe(0);
    },
  );

  it('rejects a disabled staff identity', async () => {
    await prisma.user.update({
      where: { id: users.MANAGER.id },
      data: { status: 'DISABLED' },
    });

    await request(app.getHttpServer())
      .post(endpoint())
      .set('Authorization', bearer())
      .send({ roomId: roomA })
      .expect(401);
  });

  it(
    'permits administrator, manager and receptionist operations',
    async () => {
      for (
        const role of [
          'ADMIN',
          'MANAGER',
          'RECEPTIONIST',
        ]
      ) {
        const created = await request(
          app.getHttpServer(),
        )
          .post(endpoint())
          .set('Authorization', bearer(role))
          .send({ roomId: roomA })
          .expect(201);

        await request(app.getHttpServer())
          .get(endpoint())
          .set('Authorization', bearer(role))
          .expect(200);

        await request(app.getHttpServer())
          .post(
            `${endpoint()}/${created.body.data.id}/release`,
          )
          .set('Authorization', bearer(role))
          .expect(200);
      }
    },
  );

  it(
    'preserves assignment history, booking snapshots and operational state',
    async () => {
      const first = await assign();
      expect(first.status).toBe(201);

      const second = await request(
        app.getHttpServer(),
      )
        .post(
          `${endpoint()}/${first.body.data.id}/reassign`,
        )
        .set('Authorization', bearer())
        .send({ roomId: roomB })
        .expect(201);

      const history = await request(
        app.getHttpServer(),
      )
        .get(endpoint())
        .set('Authorization', bearer())
        .expect(200);

      expect(
        history.headers['cache-control'],
      ).toBe('no-store');

      expect(history.body.data).toHaveLength(2);

      const old = history.body.data.find(
        (row: { id: string }) =>
          row.id === first.body.data.id,
      );

      expect(old.releasedAt).toBe(
        second.body.data.assignedAt,
      );

      await request(app.getHttpServer())
        .post(
          `${endpoint()}/${second.body.data.id}/release`,
        )
        .set('Authorization', bearer())
        .expect(200);

      const booking =
        await prisma.reservation.findUniqueOrThrow({
          where: { id: bookingId },
        });

      expect(booking.status).toBe('CONFIRMED');
      expect(booking.nightlyRateCentavos).toBe(250_000);
      expect(booking.totalAmountCentavos).toBe(750_000);

      expect(
        await prisma.roomAssignment.count(),
      ).toBe(2);

      expect(
        await prisma.roomAssignment.count({
          where: { releasedAt: null },
        }),
      ).toBe(0);

      expect(
        await prisma.auditLog.count(),
      ).toBe(3);

      const room =
        await prisma.room.findUniqueOrThrow({
          where: { id: roomA },
        });

      expect(room.status).toBe('READY');
      expect(await prisma.payment.count()).toBe(0);
      expect(await prisma.cardAssignment.count()).toBe(0);
    },
  );

  it(
    'rejects duplicate active assignments and stale release requests',
    async () => {
      const first = await assign();

      expect(
        (await assign(roomB)).status,
      ).toBe(409);

      const second = await request(
        app.getHttpServer(),
      )
        .post(
          `${endpoint()}/${first.body.data.id}/reassign`,
        )
        .set('Authorization', bearer())
        .send({ roomId: roomB })
        .expect(201);

      await request(app.getHttpServer())
        .post(
          `${endpoint()}/${first.body.data.id}/release`,
        )
        .set('Authorization', bearer())
        .expect(409);

      const current =
        await prisma.roomAssignment.findUniqueOrThrow({
          where: { id: second.body.data.id },
        });

      expect(current.releasedAt).toBeNull();
    },
  );

  it('rejects reassignment to the same room', async () => {
    const first = await assign();

    await request(app.getHttpServer())
      .post(
        `${endpoint()}/${first.body.data.id}/reassign`,
      )
      .set('Authorization', bearer())
      .send({ roomId: roomA })
      .expect(400);

    expect(
      await prisma.roomAssignment.count(),
    ).toBe(1);
  });

  it(
    'rejects missing records and client-controlled timestamps or status',
    async () => {
      expect(
        (await assign(roomA, 'missing')).status,
      ).toBe(404);

      expect(
        (await assign('missing')).status,
      ).toBe(404);

      await request(app.getHttpServer())
        .post(endpoint())
        .set('Authorization', bearer())
        .send({
          roomId: roomA,
          status: 'CHECKED_IN',
          assignedAt: new Date().toISOString(),
        })
        .expect(400);
    },
  );

  for (
    const status of [
      'PENDING',
      'CANCELLED',
      'EXPIRED',
      'CHECKED_IN',
      'CHECKED_OUT',
    ] as const
  ) {
    it(
      `rejects writes for a ${status} booking`,
      async () => {
        await prisma.reservation.update({
          where: { id: bookingId },
          data: { status },
        });

        expect(
          (await assign()).status,
        ).toBe(409);

        expect(
          await prisma.roomAssignment.count(),
        ).toBe(0);
      },
    );
  }

  it(
    'rejects a confirmed booking with no remaining stay dates',
    async () => {
      await prisma.reservation.update({
        where: { id: bookingId },
        data: {
          checkInDate: date(-3),
          checkOutDate: date(0),
        },
      });

      expect(
        (await assign()).status,
      ).toBe(409);
    },
  );

  it('rejects room-type mismatches', async () => {
    const other = await prisma.roomType.create({
      data: {
        propertyId,
        name: 'Other',
        capacity: 2,
        baseRateCentavos: 300_000,
      },
    });

    await prisma.room.update({
      where: { id: roomB },
      data: { roomTypeId: other.id },
    });

    expect(
      (await assign(roomB)).status,
    ).toBe(409);
  });

  for (
    const status of [
      'MAINTENANCE',
      'OUT_OF_SERVICE',
    ] as const
  ) {
    it(`rejects a ${status} room`, async () => {
      await prisma.room.update({
        where: { id: roomA },
        data: { status },
      });

      expect(
        (await assign()).status,
      ).toBe(409);
    });
  }

  it('rejects inactive rooms and room types', async () => {
    await prisma.room.update({
      where: { id: roomA },
      data: { isActive: false },
    });

    expect((await assign()).status).toBe(409);

    await prisma.room.update({
      where: { id: roomA },
      data: { isActive: true },
    });

    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: { isActive: false },
    });

    expect((await assign()).status).toBe(409);
  });

  it(
    'respects active blocks while ignoring canceled ones',
    async () => {
      const block = await prisma.roomBlock.create({
        data: {
          roomId: roomA,
          startDate: date(10),
          endDate: date(13),
          reason: 'Test',
        },
      });

      expect((await assign()).status).toBe(409);

      await prisma.roomBlock.update({
        where: { id: block.id },
        data: { canceledAt: new Date() },
      });

      expect((await assign()).status).toBe(201);
    },
  );

  it(
    'requires READY for an arrival today but allows CLEANING for a future stay',
    async () => {
      await prisma.room.update({
        where: { id: roomA },
        data: { status: 'CLEANING' },
      });

      expect((await assign()).status).toBe(201);

      const first =
        await prisma.roomAssignment.findFirstOrThrow();

      await service.release(
        bookingId,
        first.id,
        users.MANAGER,
      );

      await prisma.reservation.update({
        where: { id: bookingId },
        data: {
          checkInDate: date(0),
          checkOutDate: date(2),
        },
      });

      expect((await assign()).status).toBe(409);

      await prisma.room.update({
        where: { id: roomA },
        data: { status: 'READY' },
      });

      expect((await assign()).status).toBe(201);
    },
  );

  it(
    'allows back-to-back bookings to use the same room',
    async () => {
      expect((await assign()).status).toBe(201);

      const next = await seedBooking(13, 15);

      expect(
        (await assign(roomA, next.id)).status,
      ).toBe(201);
    },
  );

  it(
    'does not strand an unassigned booking when pinning another booking to a room',
    async () => {
      await prisma.reservation.update({
        where: { id: bookingId },
        data: {
          checkOutDate: date(14),
          totalAmountCentavos: 1_000_000,
        },
      });

      const short = await seedBooking(11, 13);

      await prisma.roomBlock.create({
        data: {
          roomId: roomB,
          startDate: date(10),
          endDate: date(11),
          reason: 'Test',
        },
      });

      expect(
        (await assign(roomA, short.id)).status,
      ).toBe(409);

      expect(
        await prisma.roomAssignment.count(),
      ).toBe(0);

      expect(
        await prisma.auditLog.count(),
      ).toBe(0);

      expect(
        (await assign(roomB, short.id)).status,
      ).toBe(201);
    },
  );

  it(
    'rolls back reassignment and preserves the old assignment when audit persistence fails',
    async () => {
      const first = await service.assign(
        bookingId,
        roomA,
        users.MANAGER,
      );

      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_assignment_audit
        BEFORE INSERT ON "AuditLog"
        BEGIN
          SELECT RAISE(
            ABORT,
            'test-only audit failure'
          );
        END
      `);

      await expect(
        service.reassign(
          bookingId,
          first.id,
          roomB,
          users.MANAGER,
        ),
      ).rejects.toThrow();

      const stored =
        await prisma.roomAssignment.findUniqueOrThrow({
          where: { id: first.id },
        });

      expect(stored.releasedAt).toBeNull();

      expect(
        await prisma.roomAssignment.count(),
      ).toBe(1);

      expect(
        await prisma.auditLog.count(),
      ).toBe(1);
    },
  );

  for (const sameBooking of [true, false]) {
    it(
      `allows exactly one competing assignment across independent clients (${sameBooking ? 'same booking' : 'same room'})`,
      async () => {
        const otherBooking = sameBooking
          ? bookingId
          : (await seedBooking()).id;

        const other = new PrismaClient({
          adapter: new PrismaBetterSqlite3({
            url: `file:${resolve(
              directory,
              'assignments.test.db',
            ).replaceAll('\\', '/')}`,
            timeout: 0,
          }),
        });

        const db = other as PrismaService;

        const otherService =
          new RoomAssignmentsService(
            db,
            new InventorySafetyService(
              db,
              new RoomRateCapacityService(),
            ),
          );

        try {
          const results = await Promise.allSettled([
            service.assign(
              bookingId,
              roomA,
              users.MANAGER,
            ),
            otherService.assign(
              otherBooking,
              sameBooking ? roomB : roomA,
              users.MANAGER,
            ),
          ]);

          expect(
            results.filter(
              (result) =>
                result.status === 'fulfilled',
            ),
          ).toHaveLength(1);

          const failure = results.find(
            (result) =>
              result.status === 'rejected',
          );

          expect(
            failure?.status === 'rejected' &&
            failure.reason,
          ).toBeInstanceOf(ConflictException);

          expect(
            await prisma.roomAssignment.count({
              where: { releasedAt: null },
            }),
          ).toBe(1);

          expect(
            await prisma.auditLog.count(),
          ).toBe(1);
        } finally {
          await other.$disconnect();
        }
      },
    );
  }
});