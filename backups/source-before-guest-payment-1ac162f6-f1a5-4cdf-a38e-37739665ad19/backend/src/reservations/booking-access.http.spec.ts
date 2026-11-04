import 'reflect-metadata';

import { createHash, randomUUID } from 'node:crypto';

import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';

import { resolve } from 'node:path';

import {
  Logger,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';

import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
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

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

import { ReservationsModule } from './reservations.module.js';
import { BookingAccessService } from './booking-access.service.js';
import { BookingAccessEmailService } from './booking-access-email.service.js';

import {
  BOOKING_COOKIE,
  BOOKING_LINK_MS,
  BOOKING_SESSION_MS,
} from './booking-access.config.js';

let app: INestApplication;
let prisma: PrismaClient;
let directory: string;
let access: BookingAccessService;
let bookingId: string;
let reference: string;

let delivered: {
  email: string;
  token: string;
}[];

const origin = 'http://localhost:5173';
const base = '/api/reservations/access';

async function issue(
  email = 'guest@example.test',
  reservationNumber = reference,
) {
  const response = await request(app.getHttpServer())
    .post(`${base}/request`)
    .set('Origin', origin)
    .send({ email, reservationNumber })
    .expect(202);

  // Wait for the mocked background delivery.
  await access.onModuleDestroy();

  return response;
}

async function exchange(token: string) {
  return request(app.getHttpServer())
    .post(`${base}/exchange`)
    .set('Origin', origin)
    .send({ token });
}

function cookie(
  response: {
    headers: Record<string, unknown>;
  },
) {
  const values =
    response.headers['set-cookie'] as unknown as string[];

  return values[0].split(';')[0];
}

describe('Step 5 — private booking access', () => {
  beforeEach(async () => {
    vi.stubEnv('AUTH_ALLOWED_ORIGINS', origin);
    vi.stubEnv('NODE_ENV', 'test');

    delivered = [];

    directory = mkdtempSync(
      resolve(process.cwd(), '.phase6-access-'),
    );

    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: `file:${resolve(
          directory,
          'access.test.db',
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

    async function apply(name: string) {
      const sql = readFileSync(
        resolve(migrations, name, 'migration.sql'),
        'utf8',
      );

      // For the current migration files:
      // none contain SQL triggers.
      for (
        const statement of sql
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
      ) {
        await prisma.$executeRawUnsafe(statement);
      }
    }

    for (
      const entry of entries.filter(
        (item) =>
          !item.name.endsWith(
            '_reservation_private_access',
          ),
      )
    ) {
      await apply(entry.name);
    }

    const property = await prisma.property.create({
      data: {
        name: 'Test',
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

    reference = `NX-${randomUUID()}`;

    const booking = await prisma.reservation.create({
      data: {
        reservationNumber: reference,
        roomType: {
          connect: { id: type.id },
        },
        guest: {
          create: {
            firstName: 'Private',
            lastName: 'Guest',
            email: 'guest@example.test',
          },
        },
        checkInDate:
          new Date('2030-01-10T00:00:00Z'),
        checkOutDate:
          new Date('2030-01-13T00:00:00Z'),
        guestCount: 2,
        nightlyRateCentavos: 250_000,
        totalAmountCentavos: 750_000,
        status: 'CONFIRMED',
      },
    });

    bookingId = booking.id;

    // Apply the new migration after a booking exists.
    await apply(
      '20261101070000_reservation_private_access',
    );

    const module = await Test.createTestingModule({
      imports: [
        ReservationsModule,
        ThrottlerModule.forRoot([
          { ttl: 60_000, limit: 60 },
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
      .overrideProvider(BookingAccessEmailService)
      .useValue({
        send: vi.fn(
          async (email: string, token: string) => {
            delivered.push({ email, token });
          },
        ),
      })
      .compile();

    access = module.get(BookingAccessService);

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());

    app.enableCors({
      origin,
      credentials: true,
    });

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
        resolve(root, '.phase6-access-'),
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
    'preserves the existing booking when applying the additive migration',
    async () => {
      const stored =
        await prisma.reservation.findUniqueOrThrow({
          where: { id: bookingId },
        });

      expect(stored.reservationNumber).toBe(reference);
      expect(stored.status).toBe('CONFIRMED');
      expect(stored.totalAmountCentavos).toBe(750_000);

      expect(
        await prisma.reservationAccessToken.count(),
      ).toBe(0);

      expect(
        await prisma.reservationAccessSession.count(),
      ).toBe(0);
    },
  );

  it(
    'returns the same acknowledgment for matching, unknown and wrong-email requests',
    async () => {
      const found = await issue();
      const wrong = await issue('wrong@example.test');
      const missing = await issue(
        'guest@example.test',
        'missing',
      );

      expect(found.body).toEqual(wrong.body);
      expect(found.body).toEqual(missing.body);
      expect(delivered).toHaveLength(1);

      expect(
        JSON.stringify(found.body),
      ).not.toContain(delivered[0].token);
    },
  );

  it(
    'stores only a token hash, expires the link after 15 minutes, and limits resends',
    async () => {
      const started = Date.now();

      await issue('GUEST@example.test');
      await issue();

      expect(delivered).toHaveLength(1);

      const stored =
        await prisma.reservationAccessToken
          .findFirstOrThrow();

      expect(stored.tokenHash)
        .not.toBe(delivered[0].token);

      expect(stored.tokenHash).toBe(
        createHash('sha256')
          .update(delivered[0].token)
          .digest('hex'),
      );

      expect(
        stored.expiresAt.getTime(),
      ).toBeGreaterThanOrEqual(
        started + BOOKING_LINK_MS,
      );

      expect(
        stored.expiresAt.getTime(),
      ).toBeLessThanOrEqual(
        Date.now() + BOOKING_LINK_MS,
      );
    },
  );

  it('does not consume a link through GET', async () => {
    await issue();

    await request(app.getHttpServer())
      .get(`${base}/exchange`)
      .expect(404);

    const token =
      await prisma.reservationAccessToken
        .findFirstOrThrow();

    expect(token.usedAt).toBeNull();

    expect(
      await prisma.reservationAccessSession.count(),
    ).toBe(0);
  });

  it(
    'exchanges a link once, sets a scoped HttpOnly cookie and reveals only its booking',
    async () => {
      await issue();

      const result =
        await exchange(delivered[0].token);

      expect(result.status).toBe(200);

      const header = String(
        result.headers['set-cookie'],
      );

      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
      expect(header).toContain(
        'Path=/api/reservations/access',
      );
      expect(header).toContain('Max-Age=1800');

      expect(
        JSON.stringify(result.body),
      ).not.toContain('sessionToken');

      const detail = await request(
        app.getHttpServer(),
      )
        .get(`${base}/current`)
        .set('Cookie', cookie(result))
        .expect(200);

      expect(
        detail.headers['cache-control'],
      ).toBe('no-store');

      expect(
        detail.headers[
          'access-control-allow-credentials'
        ],
      ).toBe('true');

      expect(
        detail.body.data.reservationNumber,
      ).toBe(reference);

      expect(detail.body.data.guest).toEqual({
        firstName: 'Private',
        lastName: 'Guest',
      });

      expect(detail.body.data.guestId)
        .toBeUndefined();

      expect(detail.body.data.id)
        .toBeUndefined();

      expect(
        (await exchange(delivered[0].token)).status,
      ).toBe(404);

      expect(
        await prisma.reservationAccessSession.count(),
      ).toBe(1);

      const stored =
        await prisma.reservationAccessSession
          .findFirstOrThrow();

      expect(
        stored.expiresAt.getTime(),
      ).toBeLessThanOrEqual(
        Date.now() + BOOKING_SESSION_MS,
      );

      expect(stored.tokenHash).not.toBe(
        cookie(result).split('=')[1],
      );
    },
  );

  it(
    'allows exactly one concurrent redemption of the same link',
    async () => {
      await issue();

      const attempts = await Promise.all([
        exchange(delivered[0].token),
        exchange(delivered[0].token),
      ]);

      expect(
        attempts.map((result) => result.status).sort(),
      ).toEqual([200, 404]);

      expect(
        await prisma.reservationAccessSession.count(),
      ).toBe(1);
    },
  );

  it(
    'claims a link once across independent database clients',
    async () => {
      await issue();

      const other = new PrismaClient({
        adapter: new PrismaBetterSqlite3({
          url: `file:${resolve(
            directory,
            'access.test.db',
          ).replaceAll('\\', '/')}`,
          timeout: 0,
        }),
      });

      const service = new BookingAccessService(
        other as PrismaService,
        {
          send: vi.fn(),
        } as unknown as BookingAccessEmailService,
      );

      try {
        const attempts = await Promise.allSettled([
          access.exchange(
            delivered[0].token,
            undefined,
          ),
          service.exchange(
            delivered[0].token,
            undefined,
          ),
        ]);

        expect(
          attempts.filter(
            (attempt) =>
              attempt.status === 'fulfilled',
          ),
        ).toHaveLength(1);

        expect(
          await prisma.reservationAccessSession.count(),
        ).toBe(1);
      } finally {
        await other.$disconnect();
      }
    },
  );

  it(
    'rolls back token consumption when creating a session fails',
    async () => {
      await issue();

      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_access_session
        BEFORE INSERT ON "ReservationAccessSession"
        BEGIN
          SELECT RAISE(
            ABORT,
            'test-only session failure'
          );
        END
      `);

      await expect(
        access.exchange(
          delivered[0].token,
          undefined,
        ),
      ).rejects.toThrow();

      const token =
        await prisma.reservationAccessToken
          .findFirstOrThrow();

      expect(token.usedAt).toBeNull();

      expect(
        await prisma.reservationAccessSession.count(),
      ).toBe(0);
    },
  );

  it(
    'can recover by requesting another link after the resend interval',
    async () => {
      await issue();

      await prisma.reservationAccessToken.updateMany({
        data: {
          createdAt: new Date(Date.now() - 61_000),
          expiresAt: new Date(Date.now() - 1),
        },
      });

      await issue();

      expect(delivered).toHaveLength(2);
      expect(delivered[0].token)
        .not.toBe(delivered[1].token);

      expect(
        (await exchange(delivered[1].token)).status,
      ).toBe(200);
    },
  );

  it(
    'marks session cookies Secure in production',
    async () => {
      await issue();
      vi.stubEnv('NODE_ENV', 'production');

      const result =
        await exchange(delivered[0].token);

      expect(result.status).toBe(200);

      expect(
        String(result.headers['set-cookie']),
      ).toContain('Secure');
    },
  );

  it(
    'rejects an expired or unknown token without creating a session',
    async () => {
      await issue();

      await prisma.reservationAccessToken.updateMany({
        data: {
          expiresAt: new Date(Date.now() - 1),
        },
      });

      expect(
        (await exchange(delivered[0].token)).status,
      ).toBe(404);

      expect(
        (await exchange('0'.repeat(64))).status,
      ).toBe(404);

      expect(
        await prisma.reservationAccessSession.count(),
      ).toBe(0);
    },
  );

  it(
    'rejects missing, forged and expired sessions',
    async () => {
      await request(app.getHttpServer())
        .get(`${base}/current`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`${base}/current`)
        .set(
          'Cookie',
          `${BOOKING_COOKIE}=${'0'.repeat(64)}`,
        )
        .expect(404);

      await issue();

      const result =
        await exchange(delivered[0].token);

      await prisma.reservationAccessSession.updateMany({
        data: {
          expiresAt: new Date(Date.now() - 1),
        },
      });

      await request(app.getHttpServer())
        .get(`${base}/current`)
        .set('Cookie', cookie(result))
        .expect(404);
    },
  );

  it(
    'does not accept an arbitrary reservation ID through a valid session',
    async () => {
      await issue();

      const result =
        await exchange(delivered[0].token);

      const detail = await request(
        app.getHttpServer(),
      )
        .get(
          `${base}/current?reservationId=someone-else`,
        )
        .set('Cookie', cookie(result))
        .expect(200);

      expect(
        detail.body.data.reservationNumber,
      ).toBe(reference);
    },
  );

  it(
    'revokes access and clears the cookie on logout',
    async () => {
      await issue();

      const result =
        await exchange(delivered[0].token);

      const logout = await request(
        app.getHttpServer(),
      )
        .post(`${base}/logout`)
        .set('Origin', origin)
        .set('Cookie', cookie(result))
        .expect(204);

      expect(
        String(logout.headers['set-cookie']),
      ).toContain(`${BOOKING_COOKIE}=;`);

      await request(app.getHttpServer())
        .get(`${base}/current`)
        .set('Cookie', cookie(result))
        .expect(404);
    },
  );

  it(
    'replaces the session presented by the browser when another link is redeemed',
    async () => {
      await issue();

      const first =
        await exchange(delivered[0].token);

      await prisma.reservationAccessToken.updateMany({
        data: {
          createdAt: new Date(Date.now() - 61_000),
        },
      });

      await issue();

      const second = await request(
        app.getHttpServer(),
      )
        .post(`${base}/exchange`)
        .set('Origin', origin)
        .set('Cookie', cookie(first))
        .send({
          token: delivered[1].token,
        })
        .expect(200);

      await request(app.getHttpServer())
        .get(`${base}/current`)
        .set('Cookie', cookie(first))
        .expect(404);

      await request(app.getHttpServer())
        .get(`${base}/current`)
        .set('Cookie', cookie(second))
        .expect(200);
    },
  );

  it(
    'keeps the same acknowledgment if email delivery fails',
    async () => {
      const warning = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      vi.mocked(
        app.get(BookingAccessEmailService).send,
      ).mockRejectedValueOnce(
        new Error('test-only SMTP failure'),
      );

      try {
        const failedDelivery = await issue();

        const missing = await issue(
          'wrong@example.test',
          'missing',
        );

        expect(failedDelivery.body)
          .toEqual(missing.body);

        expect(failedDelivery.status).toBe(202);
      } finally {
        warning.mockRestore();
      }
    },
  );

  it(
    'rejects missing or disallowed origins and unauthorized client fields',
    async () => {
      await request(app.getHttpServer())
        .post(`${base}/request`)
        .send({
          reservationNumber: reference,
          email: 'guest@example.test',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post(`${base}/exchange`)
        .set('Origin', 'https://other.example')
        .send({
          token: '0'.repeat(64),
        })
        .expect(403);

      await request(app.getHttpServer())
        .post(`${base}/request`)
        .set('Origin', origin)
        .send({
          reservationNumber: reference,
          email: 'guest@example.test',
          reservationId: bookingId,
        })
        .expect(400);

      expect(delivered).toHaveLength(0);
    },
  );

  it(
    'throttles link requests without exposing whether a booking exists',
    async () => {
      for (let index = 0; index < 3; index++) {
        await issue(
          'wrong@example.test',
          'missing',
        );
      }

      await request(app.getHttpServer())
        .post(`${base}/request`)
        .set('Origin', origin)
        .send({
          reservationNumber: 'missing',
          email: 'wrong@example.test',
        })
        .expect(429);
    },
  );
});