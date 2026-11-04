import 'reflect-metadata';

import {
  randomBytes,
  randomUUID,
} from 'node:crypto';

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
} from 'node:fs';

import {
  tmpdir,
} from 'node:os';

import {
  basename,
  join,
  resolve,
  sep,
} from 'node:path';

import Database from 'better-sqlite3';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import {
  ValidationPipe,
} from '@nestjs/common';

import type {
  INestApplication,
} from '@nestjs/common';

import {
  APP_GUARD,
} from '@nestjs/core';

import {
  Test,
} from '@nestjs/testing';

import {
  PassportModule,
} from '@nestjs/passport';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  JwtStrategy,
} from '../auth/jwt.strategy.js';

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
  PaymongoAdapter,
} from '../payments/paymongo.adapter.js';

import {
  PaymongoCheckoutExpirationAdapter,
} from '../payments/paymongo-checkout-expiration.adapter.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  BOOKING_COOKIE,
} from './booking-access.config.js';

import {
  BookingAccessEmailService,
} from './booking-access-email.service.js';

import {
  ReservationsModule,
} from './reservations.module.js';

const ORIGIN = 'http://localhost:5173';

const CREATE_PATH =
  '/api/reservations/access/guest-bookings';

const RECOVER_PATH =
  CREATE_PATH + '/recover';

const PROPERTY_ID = 'guest-http-property';
const ROOM_TYPE_ID = 'guest-http-room-type';

let directory = '';
let prisma: PrismaService;
let app: INestApplication;

function payload(
  paymentPreference:
    | 'PAY_AT_PROPERTY'
    | 'PAYMONGO' = 'PAY_AT_PROPERTY',
) {
  const today = todayInPhilippines();

  return {
    requestId: randomUUID(),
    recoveryToken:
      randomBytes(32).toString('hex'),
    roomTypeId: ROOM_TYPE_ID,
    checkIn: new Date(
      today.getTime() +
        10 * 86_400_000,
    ).toISOString().slice(0, 10),
    checkOut: new Date(
      today.getTime() +
        11 * 86_400_000,
    ).toISOString().slice(0, 10),
    guests: 1,
    firstName: 'Synthetic',
    lastName: 'Guest',
    email: 'guest-http@example.invalid',
    arrivalTime: '14:00',
    paymentPreference,
    acknowledgmentAccepted: true,
  };
}

function create(input: object) {
  return request(app.getHttpServer())
    .post(CREATE_PATH)
    .set('Origin', ORIGIN)
    .send(input);
}

function recover(input: object) {
  return request(app.getHttpServer())
    .post(RECOVER_PATH)
    .set('Origin', ORIGIN)
    .send(input);
}

function cookieFrom(response: {
  headers: Record<string, unknown>;
}): string {
  const header =
    response.headers['set-cookie'];

  const values = typeof header === 'string'
    ? [header]
    : Array.isArray(header)
      ? header
      : [];

  const cookie = values.find(
    (value: unknown) =>
      typeof value === 'string' &&
      value.startsWith(
        BOOKING_COOKIE + '=',
      ),
  );

  if (typeof cookie !== 'string') {
    throw new Error(
      'Expected a synthetic booking cookie.',
    );
  }

  return cookie.split(';')[0];
}

beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'test');

  vi.stubEnv(
    'AUTH_ALLOWED_ORIGINS',
    ORIGIN,
  );

  vi.stubEnv(
    'JWT_ACCESS_SECRET',
    'synthetic-guest-http-secret-at-least-32-bytes',
  );

  vi.stubEnv(
    'NEXORA_BOOKING_DEADLINE_WORKER_ENABLED',
    'false',
  );

  directory = mkdtempSync(
    join(tmpdir(), 'nexora-guest-http-'),
  );

  const databasePath = join(
    directory,
    'guest-http.test.db',
  );

  const fixture = new Database(databasePath);

  try {
    const migrationRoot = resolve(
      process.cwd(),
      'prisma/migrations',
    );

    const migrations = readdirSync(
      migrationRoot,
      { withFileTypes: true },
    )
      .filter(
        (entry) => entry.isDirectory(),
      )
      .map((entry) => entry.name)
      .sort(
        (first, second) =>
          first.localeCompare(second),
      );

    for (const migration of migrations) {
      const file = join(
        migrationRoot,
        migration,
        'migration.sql',
      );

      if (!existsSync(file)) {
        throw new Error(
          'Migration SQL is missing.',
        );
      }

      fixture.exec(
        readFileSync(file, 'utf8'),
      );
    }
  } finally {
    fixture.close();
  }

  vi.stubEnv(
    'NEXORA_RUNTIME_DATABASE_URL',
    `file:${databasePath.replaceAll('\\', '/')}`,
  );

  prisma = new PrismaService();

  await prisma.$connect();

  await prisma.$queryRawUnsafe(
    'PRAGMA busy_timeout = 0',
  );

  await prisma.property.create({
    data: {
      id: PROPERTY_ID,
      name: 'Synthetic HTTP property',
      address: 'Synthetic address',
      city: 'Test City',
      province: 'Test Province',
      country: 'Philippines',
    },
  });

  await prisma.roomType.create({
    data: {
      id: ROOM_TYPE_ID,
      propertyId: PROPERTY_ID,
      name: 'Synthetic HTTP room',
      capacity: 2,
      baseRateCentavos: 100000,
      isActive: true,
    },
  });

  await prisma.room.create({
    data: {
      roomTypeId: ROOM_TYPE_ID,
      roomNumber: 'HTTP-101',
      status: 'READY',
      isActive: true,
    },
  });

  const moduleRef =
    await Test.createTestingModule({
      imports: [
        ReservationsModule,
        PassportModule,
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
        send: vi.fn()
          .mockResolvedValue(undefined),
      })
      .overrideProvider(PaymongoAdapter)
      .useValue({
        settings: vi.fn().mockReturnValue({
          secret: 'sk_test_synthetic_only',
          returnUrl:
            ORIGIN + '/payment-return',
          methods: ['qrph'],
        }),
        create: vi.fn().mockResolvedValue({
          id: 'cs_guest_http',
          url:
            'https://checkout.paymongo.com/guest-http',
        }),
      })
      .overrideProvider(
        PaymongoCheckoutExpirationAdapter,
      )
      .useValue({
        close: vi.fn()
          .mockResolvedValue('EXPIRED'),
      })
      .compile();

  app = moduleRef.createNestApplication();

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
  try {
    await app?.close();
    await prisma?.$disconnect();
  } finally {
    vi.unstubAllEnvs();
  }

  if (!directory) {
    return;
  }

  const target = resolve(directory);

  if (
    !target.startsWith(
      resolve(tmpdir()) + sep,
    ) ||
    !basename(target).startsWith(
      'nexora-guest-http-',
    )
  ) {
    throw new Error(
      'Refusing unsafe fixture cleanup.',
    );
  }

  for (const filename of [
    'guest-http.test.db',
    'guest-http.test.db-journal',
    'guest-http.test.db-wal',
    'guest-http.test.db-shm',
  ]) {
    rmSync(
      join(target, filename),
      { force: true },
    );
  }

  rmdirSync(target);

  directory = '';
});

describe('secure guest booking HTTP API', () => {
  it.each([
    'PAY_AT_PROPERTY',
    'PAYMONGO',
  ] as const)('creates a pending %s booking without login', async (method) => {
    const input = payload(method);

    const response =
      await create(input).expect(200);

    expect(response.body.data).toMatchObject({
      requestId: input.requestId,
      status: 'PENDING',
      paymentPreference: method,
      nightlyRateCentavos: 100000,
      totalAmountCentavos: 100000,
      replayed: false,
    });

    expect(
      response.headers['cache-control'],
    ).toBe('no-store');

    expect(
      response.headers.vary,
    ).toContain('Cookie');

    const cookie = cookieFrom(response);

    const header = String(
      response.headers['set-cookie'],
    );

    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Strict');

    expect(header).toContain(
      'Path=/api/reservations/access',
    );

    const serialized =
      JSON.stringify(response.body);

    expect(serialized).not.toContain(
      input.recoveryToken,
    );

    expect(serialized).not.toContain(
      cookie.slice(cookie.indexOf('=') + 1),
    );

    expect(response.body.data.session).toBeUndefined();
    expect(response.body.data.token).toBeUndefined();

    const current = await request(
      app.getHttpServer(),
    )
      .get('/api/reservations/access/current')
      .set('Cookie', cookie)
      .expect(200);

    expect(current.body.data).toMatchObject({
      reservationNumber:
        response.body.data.reservationNumber,
      status: 'PENDING',
    });

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });

    it('returns the stored booking policy and arrival details privately', async () => {
    const input = payload('PAY_AT_PROPERTY');

    const created =
      await create(input).expect(200);

    const response = await request(
      app.getHttpServer(),
    )
      .get('/api/reservations/access/current')
      .set('Cookie', cookieFrom(created))
      .expect(200);

    expect(response.body.data).toMatchObject({
      bookingPolicyVersion:
        'guest-booking-v2',
      paymentPreference:
        'PAY_AT_PROPERTY',
      expectedArrivalAt:
        created.body.data.expectedArrivalAt,
      holdExpiresAt:
        created.body.data.holdExpiresAt,
      firstContactedAt: null,
      responseDeadlineAt: null,
      confirmedAt: null,
      holdExpired: false,
    });

    expect(response.body.data.recoveryToken)
      .toBeUndefined();

    expect(response.body.data.token)
      .toBeUndefined();
  });

  it('reports an overdue hold without modifying the reservation during a read', async () => {
    const created = await create(
      payload('PAYMONGO'),
    ).expect(200);

    const booking =
      await prisma.reservation.update({
        where: {
          reservationNumber:
            created.body.data.reservationNumber,
        },
        data: {
          holdExpiresAt:
            new Date(Date.now() - 1),
        },
      });

    const response = await request(
      app.getHttpServer(),
    )
      .get('/api/reservations/access/current')
      .set('Cookie', cookieFrom(created))
      .expect(200);

    expect(response.body.data).toMatchObject({
      status: 'PENDING',
      holdExpired: true,
    });

    const stored =
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      });

    expect(stored.status).toBe('PENDING');
    expect(stored.updatedAt).toEqual(
      booking.updatedAt,
    );
  });

  it('does not invent policy information for legacy bookings', async () => {
    const created =
      await create(payload()).expect(200);

    await prisma.reservation.update({
      where: {
        reservationNumber:
          created.body.data.reservationNumber,
      },
      data: {
        bookingPolicyVersion: null,
        paymentPreference: null,
        expectedArrivalAt: null,
        firstContactedAt: null,
        responseDeadlineAt: null,
        confirmedAt: null,
        holdExpiresAt: null,
      },
    });

    const response = await request(
      app.getHttpServer(),
    )
      .get('/api/reservations/access/current')
      .set('Cookie', cookieFrom(created))
      .expect(200);

    expect(response.body.data).toMatchObject({
      bookingPolicyVersion: null,
      paymentPreference: null,
      expectedArrivalAt: null,
      firstContactedAt: null,
      responseDeadlineAt: null,
      confirmedAt: null,
      holdExpiresAt: null,
      holdExpired: false,
    });
  });

  it('uses a Secure cookie in production mode', async () => {
    vi.stubEnv(
      'NODE_ENV',
      'production',
    );

    const response =
      await create(payload()).expect(200);

    expect(
      String(
        response.headers['set-cookie'],
      ),
    ).toContain('Secure');
  });

  it('replays the original creation without another booking', async () => {
    const input = payload();

    const first =
      await create(input).expect(200);

    const repeated =
      await create(input).expect(200);

    expect(
      repeated.body.data.reservationNumber,
    ).toBe(
      first.body.data.reservationNumber,
    );

    expect(
      repeated.body.data.replayed,
    ).toBe(true);

    expect(
      await prisma.reservation.count(),
    ).toBe(1);

    expect(
      await prisma.guest.count(),
    ).toBe(1);

    expect(
      await prisma.guestBookingAttempt.count(),
    ).toBe(1);
  });

  it('recovers the original booking and sets private access', async () => {
    const input = payload();

    const created =
      await create(input).expect(200);

    const response = await recover({
      requestId: input.requestId,
      recoveryToken: input.recoveryToken,
    }).expect(200);

    expect(response.body.data).toMatchObject({
      reservationNumber:
        created.body.data.reservationNumber,
      replayed: true,
    });

    const cookie = cookieFrom(response);

    await request(app.getHttpServer())
      .get('/api/reservations/access/current')
      .set('Cookie', cookie)
      .expect(200);

    expect(
      await prisma.reservation.count(),
    ).toBe(1);

    expect(
      JSON.stringify(response.body),
    ).not.toContain(
      input.recoveryToken,
    );
  });

  it('does not recover using a request ID alone or a wrong credential', async () => {
    const input = payload();

    await create(input).expect(200);

    await recover({
      requestId: input.requestId,
    }).expect(400);

    const wrong = await recover({
      requestId: input.requestId,
      recoveryToken:
        randomBytes(32).toString('hex'),
    }).expect(404);

    const missing = await recover({
      requestId: randomUUID(),
      recoveryToken:
        randomBytes(32).toString('hex'),
    }).expect(404);

    expect(wrong.body).toEqual(
      missing.body,
    );

    expect(
      wrong.headers['set-cookie'],
    ).toBeUndefined();

    expect(
      wrong.headers['cache-control'],
    ).toBe('no-store');
  });

  it('rejects an expired recovery credential', async () => {
    const input = payload();

    await create(input).expect(200);

    await prisma.guestBookingAttempt.update({
      where: {
        requestId: input.requestId,
      },
      data: {
        recoveryExpiresAt:
          new Date(Date.now() - 1),
      },
    });

    await recover({
      requestId: input.requestId,
      recoveryToken: input.recoveryToken,
    }).expect(404);
  });

  it.each([
    undefined,
    'https://unapproved.example.invalid',
  ])('rejects an unapproved or missing Origin: %s', async (origin) => {
    const call = request(
      app.getHttpServer(),
    ).post(CREATE_PATH);

    if (origin) {
      call.set('Origin', origin);
    }

    const response = await call
      .send(payload())
      .expect(403);

    expect(
      response.headers['cache-control'],
    ).toBe('no-store');

    expect(
      response.headers['set-cookie'],
    ).toBeUndefined();

    expect(
      await prisma.reservation.count(),
    ).toBe(0);
  });

  it.each([
    ['status', 'CONFIRMED'],
    ['nightlyRateCentavos', 1],
    ['totalAmountCentavos', 1],
    ['actorUserId', 'synthetic-admin'],
  ] as const)('rejects client-controlled %s', async (field, value) => {
    const response = await create({
      ...payload(),
      [field]: value,
    }).expect(400);

    expect(
      response.headers['cache-control'],
    ).toBe('no-store');

    expect(
      await prisma.reservation.count(),
    ).toBe(0);
  });

  it('requires arrival time and policy acknowledgment', async () => {
    const input = payload();

    await create({
      ...input,
      arrivalTime: undefined,
    }).expect(400);

    await create({
      ...input,
      acknowledgmentAccepted: false,
    }).expect(400);

    expect(
      await prisma.reservation.count(),
    ).toBe(0);
  });

  it('rejects credentials in query parameters', async () => {
    const input = payload();

    await request(app.getHttpServer())
      .post(
        CREATE_PATH + '?requestId=synthetic',
      )
      .set('Origin', ORIGIN)
      .send(input)
      .expect(400);

    await request(app.getHttpServer())
      .post(
        RECOVER_PATH + '?recoveryToken=synthetic',
      )
      .set('Origin', ORIGIN)
      .send({
        requestId: input.requestId,
        recoveryToken:
          input.recoveryToken,
      })
      .expect(400);

    expect(
      await prisma.reservation.count(),
    ).toBe(0);
  });

  it('does not provide recovery through GET', async () => {
    await request(app.getHttpServer())
      .get(RECOVER_PATH)
      .expect(404);

    expect(
      await prisma.reservation.count(),
    ).toBe(0);
  });

  it('does not grant private access from booking reference and email', async () => {
    const input = payload();

    const created =
      await create(input).expect(200);

    await request(app.getHttpServer())
      .get('/api/reservations/access/current')
      .query({
        reservationNumber:
          created.body.data.reservationNumber,
        email: input.email,
      })
      .expect(404);
  });

  it('recovers closed booking history without reviving it', async () => {
    const input = payload();

    const created =
      await create(input).expect(200);

    await prisma.reservation.update({
      where: {
        reservationNumber:
          created.body.data.reservationNumber,
      },
      data: {
        status: 'EXPIRED',
        holdExpiresAt:
          new Date(Date.now() - 1),
      },
    });

    const recovered = await recover({
      requestId: input.requestId,
      recoveryToken: input.recoveryToken,
    }).expect(200);

    expect(
      recovered.body.data.status,
    ).toBe('EXPIRED');

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('throttles booking creation and keeps the error private', async () => {
    for (let index = 0; index < 5; index += 1) {
      await create({}).expect(400);
    }

    const response =
      await create({}).expect(429);

    expect(
      response.headers['cache-control'],
    ).toBe('no-store');

    expect(
      response.headers['set-cookie'],
    ).toBeUndefined();

    expect(
      await prisma.reservation.count(),
    ).toBe(0);
  });

  it('throttles recovery attempts', async () => {
    const input = {
      requestId: randomUUID(),
      recoveryToken:
        randomBytes(32).toString('hex'),
    };

    for (let index = 0; index < 5; index += 1) {
      await recover(input).expect(404);
    }

    const response =
      await recover(input).expect(429);

    expect(
      response.headers['cache-control'],
    ).toBe('no-store');
  });

  it('returns retryable failure without setting a cookie when persistence fails', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "reject_guest_http_audit"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'reservation.guest_booking_requested'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic failure');
      END
    `);

    const input = payload();

    const response =
      await create(input).expect(503);

    expect(
      response.headers['set-cookie'],
    ).toBeUndefined();

    expect(
      response.headers['cache-control'],
    ).toBe('no-store');

    expect(
      JSON.stringify(response.body),
    ).not.toContain(
      input.recoveryToken,
    );

    expect(
      await prisma.reservation.count(),
    ).toBe(0);

    expect(
      await prisma.reservationAccessSession.count(),
    ).toBe(0);

    expect(
      await prisma.guestBookingAttempt.count(),
    ).toBe(0);
  });

    it('reads and creates checkout for the booking named by the guest', async () => {
    const created = await create(
      payload('PAYMONGO'),
    ).expect(200);

    const cookie = cookieFrom(created);

    const scope = {
      expectedReservationNumber:
        created.body.data.reservationNumber,
    };

    const current = await request(
      app.getHttpServer(),
    )
      .post(
        CREATE_PATH + '/checkout/current',
      )
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send(scope)
      .expect(200);

    expect(current.body.data).toMatchObject({
      state: 'NONE',
      amountCentavos: 100000,
      checkoutUrl: null,
    });

    const started = await request(
      app.getHttpServer(),
    )
      .post(
        CREATE_PATH + '/checkout',
      )
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send({
        ...scope,
        requestId: randomUUID(),
      })
      .expect(200);

    expect(started.body.data).toMatchObject({
      state: 'READY',
      amountCentavos: 100000,
    });

    expect(
      started.headers['cache-control'],
    ).toBe('no-store');

    expect(
      await prisma.payment.count(),
    ).toBe(1);
  });

  it('rejects a different booking reference before creating payment', async () => {
    const created = await create(
      payload('PAYMONGO'),
    ).expect(200);

    const cookie = cookieFrom(created);

    const scope = {
      expectedReservationNumber:
        'NX-different-booking',
    };

    await request(app.getHttpServer())
      .post(
        CREATE_PATH + '/checkout/current',
      )
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send(scope)
      .expect(404);

    await request(app.getHttpServer())
      .post(
        CREATE_PATH + '/checkout',
      )
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send({
        ...scope,
        requestId: randomUUID(),
      })
      .expect(404);

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });

  it('does not authorize checkout from a booking reference alone', async () => {
    const created = await create(
      payload('PAYMONGO'),
    ).expect(200);

    await request(app.getHttpServer())
      .post(
        CREATE_PATH + '/checkout',
      )
      .set('Origin', ORIGIN)
      .send({
        expectedReservationNumber:
          created.body.data.reservationNumber,
        requestId: randomUUID(),
      })
      .expect(404);

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });

  it('rejects client amounts on scoped checkout', async () => {
    const created = await create(
      payload('PAYMONGO'),
    ).expect(200);

    await request(app.getHttpServer())
      .post(
        CREATE_PATH + '/checkout',
      )
      .set('Origin', ORIGIN)
      .set(
        'Cookie',
        cookieFrom(created),
      )
      .send({
        expectedReservationNumber:
          created.body.data.reservationNumber,
        requestId: randomUUID(),
        amountCentavos: 1,
      })
      .expect(400);

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });
});