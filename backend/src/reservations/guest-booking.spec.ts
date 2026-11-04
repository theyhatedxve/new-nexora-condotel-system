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

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  RoomRateCapacityService,
} from '../common/validation/room-rate-capacity.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  hash,
  requireBookingSession,
} from './booking-access-security.js';

import {
  CreateGuestBookingDto,
} from './dto/create-guest-booking.dto.js';

import {
  GuestBookingService,
} from './guest-booking.service.js';

import {
  ReservationValidationService,
} from './reservation-validation.service.js';

import {
  HOLD_DURATION_MS,
  ReservationAcquisitionService,
} from './reservation-acquisition.service.js';

import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  GuestBookingStaffService,
} from './guest-booking-staff.service.js';

import {
  createHmac,
} from 'node:crypto';

import {
  OwnershipService,
} from '../common/ownership/ownership.service.js';

import {
  CheckoutService,
} from '../payments/checkout.service.js';

import {
  PaymongoAdapter,
} from '../payments/paymongo.adapter.js';

import {
  PaymongoWebhookService,
} from '../payments/paymongo-webhook.service.js';

import {
  PaymentSummaryService,
} from '../payments/payment-summary.service.js';

import {
  ServiceUnavailableException,
} from '@nestjs/common';

import type {
  MockInstance,
} from 'vitest';

import {
  GuestBookingDeadlineService,
} from '../payments/guest-booking-deadline.service.js';

import {
  PaymongoCheckoutExpirationAdapter,
} from '../payments/paymongo-checkout-expiration.adapter.js';

const PROPERTY_ID = 'guest-booking-property';
const ROOM_TYPE_ID = 'guest-booking-room-type';
const DAY_MS = 24 * 60 * 60 * 1000;

let directory = '';
let clients: PrismaService[] = [];
let prisma: PrismaService;
let service: GuestBookingService;

function makeService(client: PrismaService) {
  const validation =
    new ReservationValidationService(
      client,
      new RoomRateCapacityService(),
    );

  const acquisition =
    new ReservationAcquisitionService(
      client,
      validation,
    );

  return new GuestBookingService(
    client,
    acquisition,
  );
}

async function openClient() {
  const client = new PrismaService();

  clients.push(client);

  await client.$connect();

  await client.$queryRawUnsafe(
    'PRAGMA busy_timeout = 0',
  );

  return client;
}

function payload(): CreateGuestBookingDto {
  const today = todayInPhilippines();

  return {
    requestId: randomUUID(),
    recoveryToken:
      randomBytes(32).toString('hex'),
    roomTypeId: ROOM_TYPE_ID,
    checkIn: new Date(
      today.getTime() + 10 * DAY_MS,
    ).toISOString().slice(0, 10),
    checkOut: new Date(
      today.getTime() + 11 * DAY_MS,
    ).toISOString().slice(0, 10),
    guests: 1,
    firstName: 'Synthetic',
    lastName: 'Guest',
    email: 'guest-booking@example.invalid',
    arrivalTime: '14:00',
    paymentPreference: 'PAY_AT_PROPERTY',
    acknowledgmentAccepted: true,
  };
}

beforeEach(async () => {
  clients = [];

  directory = mkdtempSync(
    join(tmpdir(), 'nexora-guest-booking-'),
  );

  const databasePath = join(
    directory,
    'booking.test.db',
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
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((first, second) =>
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

  prisma = await openClient();
  service = makeService(prisma);

  await prisma.property.create({
    data: {
      id: PROPERTY_ID,
      name: 'Synthetic booking property',
      address: 'Synthetic test address',
      city: 'Test City',
      province: 'Test Province',
      country: 'Philippines',
    },
  });

  await prisma.roomType.create({
    data: {
      id: ROOM_TYPE_ID,
      propertyId: PROPERTY_ID,
      name: 'Synthetic booking room type',
      capacity: 2,
      baseRateCentavos: 100000,
      isActive: true,
    },
  });

  await prisma.room.create({
    data: {
      roomTypeId: ROOM_TYPE_ID,
      roomNumber: 'TEST-101',
      status: 'READY',
      isActive: true,
    },
  });
});

afterEach(async () => {
  try {
    for (const client of clients) {
      await client.$disconnect();
    }
  } finally {
    vi.unstubAllEnvs();
  }

  if (!directory) return;

  const resolvedDirectory = resolve(directory);

  if (
    !resolvedDirectory.startsWith(
      resolve(tmpdir()) + sep,
    ) ||
    !basename(resolvedDirectory).startsWith(
      'nexora-guest-booking-',
    )
  ) {
    throw new Error(
      'Refusing unsafe fixture cleanup.',
    );
  }

  for (const name of [
    'booking.test.db',
    'booking.test.db-journal',
    'booking.test.db-wal',
    'booking.test.db-shm',
  ]) {
    rmSync(
      join(resolvedDirectory, name),
      { force: true },
    );
  }

  rmdirSync(resolvedDirectory);
  directory = '';
});

describe('durable guest booking creation', () => {
  it('creates a pending property request and a scoped private session', async () => {
    const input = payload();

    const result = await service.create(input);

    expect(result.receipt.status).toBe('PENDING');

    expect(
      result.receipt.paymentPreference,
    ).toBe('PAY_AT_PROPERTY');

    expect(
      result.receipt.holdExpiresAt,
    ).toEqual(
      new Date(
        `${input.checkIn}T14:30:00+08:00`,
      ),
    );

    expect(
      await prisma.reservation.count(),
    ).toBe(1);

    expect(
      await prisma.guest.count(),
    ).toBe(1);

    const attempt =
      await prisma.guestBookingAttempt
        .findUniqueOrThrow({
          where: {
            requestId: input.requestId,
          },
        });

    expect(attempt.state).toBe(
      'RESERVATION_CREATED',
    );

    expect(attempt.recoveryTokenHash).toBe(
      hash(input.recoveryToken),
    );

    expect(attempt.recoveryTokenHash).not.toBe(
      input.recoveryToken,
    );

    const session = await requireBookingSession(
      prisma,
      result.session.token,
    );

    expect(session.reservationId).toBe(
      attempt.reservationId,
    );
  });

  it('replays the original request without another guest or reservation', async () => {
    const input = payload();

    const first = await service.create(input);
    const second = await service.create(input);

    expect(second.replayed).toBe(true);

    expect(
      second.receipt.reservationNumber,
    ).toBe(first.receipt.reservationNumber);

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

  it('rejects a changed payload under the original request', async () => {
    const input = payload();

    await service.create(input);

    input.firstName = 'Different';

    await expect(
      service.create(input),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('requires the recovery credential, not only the request ID', async () => {
    const input = payload();

    await service.create(input);

    await expect(
      service.recover(
        input.requestId,
        randomBytes(32).toString('hex'),
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('recovers the stored booking without creating another reservation', async () => {
    const input = payload();

    const created = await service.create(input);

    const recovered = await service.recover(
      input.requestId,
      input.recoveryToken,
    );

    expect(
      recovered.receipt.reservationNumber,
    ).toBe(created.receipt.reservationNumber);

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('rejects an expired recovery credential', async () => {
    const input = payload();

    await service.create(input);

    await prisma.guestBookingAttempt.update({
      where: {
        requestId: input.requestId,
      },
      data: {
        recoveryExpiresAt: new Date(
          Date.now() - 1,
        ),
      },
    });

    await expect(
      service.recover(
        input.requestId,
        input.recoveryToken,
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('creates an online pending hold without recording payment', async () => {
    const input = payload();

    input.paymentPreference = 'PAYMONGO';

    const before = Date.now();

    const result = await service.create(input);

    expect(result.receipt.status).toBe(
      'PENDING',
    );

    expect(
      result.receipt.holdExpiresAt?.getTime(),
    ).toBeGreaterThanOrEqual(
      before + HOLD_DURATION_MS,
    );

    expect(
      result.receipt.holdExpiresAt?.getTime(),
    ).toBeLessThanOrEqual(
      Date.now() + HOLD_DURATION_MS,
    );

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });

  it('does not reuse a recovery credential for a different request ID', async () => {
    const input = payload();

    await service.create(input);

    input.requestId = randomUUID();

    await expect(
      service.create(input),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('creates one reservation across concurrent identical requests', async () => {
    const input = payload();

    const other = makeService(
      await openClient(),
    );

    const results = await Promise.all([
      service.create(input),
      other.create(input),
    ]);

    expect(
      new Set(
        results.map(
          (result) =>
            result.receipt.reservationNumber,
        ),
      ).size,
    ).toBe(1);

    expect(
      results.filter(
        (result) => result.replayed,
      ).length,
    ).toBe(1);

    expect(
      await prisma.reservation.count(),
    ).toBe(1);

    expect(
      await prisma.guestBookingAttempt.count(),
    ).toBe(1);
  });

  it('does not oversell the last room across different requests', async () => {
    const other = makeService(
      await openClient(),
    );

    const results = await Promise.allSettled([
      service.create(payload()),
      other.create(payload()),
    ]);

    expect(
      results.filter(
        (result) =>
          result.status === 'fulfilled',
      ).length,
    ).toBe(1);

    const rejected = results.find(
      (result) =>
        result.status === 'rejected',
    );

    expect(rejected?.status).toBe('rejected');

    if (rejected?.status === 'rejected') {
      expect(
        rejected.reason,
      ).toBeInstanceOf(ConflictException);
    }

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

  it('rolls back the attempt, guest, reservation, and session when auditing fails', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_guest_booking_audit"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'reservation.guest_booking_requested'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic audit failure');
      END
    `);

    await expect(
      service.create(payload()),
    ).rejects.toThrow();

    expect(
      await prisma.guestBookingAttempt.count(),
    ).toBe(0);

    expect(
      await prisma.reservation.count(),
    ).toBe(0);

    expect(
      await prisma.guest.count(),
    ).toBe(0);

    expect(
      await prisma.reservationAccessSession.count(),
    ).toBe(0);

    expect(
      await prisma.auditLog.count(),
    ).toBe(0);
  });
});

describe('pending online booking payment confirmation', () => {
  const signingSecret =
    'synthetic-guest-online-webhook-secret';

  let provider: PaymongoAdapter;
  let createCheckout: MockInstance<
    PaymongoAdapter['create']
  >;
  let checkoutService: CheckoutService;
  let webhookService: PaymongoWebhookService;
  let summaryService: PaymentSummaryService;

    beforeEach(() => {
    vi.stubEnv(
      'PAYMONGO_TEST_WEBHOOK_SECRET',
      signingSecret,
    );

    provider = new PaymongoAdapter();

    vi.spyOn(provider, 'settings').mockReturnValue({
      secret: 'sk_test_synthetic_only',
      returnUrl:
        'http://localhost:5173/payment-return',
      methods: ['qrph'],
    });

    createCheckout = vi.spyOn(
      provider,
      'create',
    );

    createCheckout.mockResolvedValue({
      id: 'cs_guest_online',
      url:
        'https://checkout.paymongo.com/guest-online',
    });

    const ownership =
      new OwnershipService(prisma);

    checkoutService = new CheckoutService(
      prisma,
      ownership,
      provider,
    );

    webhookService =
      new PaymongoWebhookService(prisma);

    summaryService = new PaymentSummaryService(
      prisma,
      ownership,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function onlineRequest() {
    const input = payload();

    input.paymentPreference = 'PAYMONGO';

    const created = await service.create(input);

    const attempt =
      await prisma.guestBookingAttempt.findUniqueOrThrow({
        where: {
          requestId: input.requestId,
        },
      });

    if (!attempt.reservationId) {
      throw new Error('Synthetic reservation is missing.');
    }

    return {
      id: attempt.reservationId,
      reference:
        created.receipt.reservationNumber,
      token: created.session.token,
    };
  }

  async function startOnline() {
    const booking = await onlineRequest();
    const requestId = randomUUID();

    const response =
      await checkoutService.startForSession(
        booking.token,
        requestId,
      );

    const payment =
      await prisma.payment.findFirstOrThrow({
        where: {
          reservationId: booking.id,
        },
      });

    return {
      booking,
      requestId,
      response,
      payment,
    };
  }

  function paidEvent(
    paymentId: string,
    eventId = `evt_${randomBytes(12).toString('hex')}`,
    amount = 100000,
    currency = 'PHP',
  ) {
    return {
      data: {
        id: eventId,
        type: 'event',
        attributes: {
          type: 'checkout_session.payment.paid',
          livemode: false,
          created_at: Math.floor(Date.now() / 1000),
          data: {
            id: 'cs_guest_online',
            type: 'checkout_session',
            attributes: {
              reference_number: paymentId,
              payments: [
                {
                  id: 'pay_guest_online',
                  type: 'payment',
                  attributes: {
                    status: 'paid',
                    amount,
                    currency,
                    livemode: false,
                  },
                },
              ],
            },
          },
        },
      },
    };
  }

  function deliver(
    event: ReturnType<typeof paidEvent>,
    target = webhookService,
  ) {
    const raw = Buffer.from(
      JSON.stringify(event),
      'utf8',
    );

    const timestamp = String(
      Math.floor(Date.now() / 1000),
    );

    const signature = createHmac(
      'sha256',
      signingSecret,
    )
      .update(timestamp)
      .update('.')
      .update(raw)
      .digest('hex');

    return target.handle(
      raw,
      `t=${timestamp},te=${signature},li=`,
    );
  }

  it('creates a checkout link while leaving the booking pending', async () => {
    const result = await startOnline();

    expect(result.response.state).toBe('READY');

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });

    expect(result.payment.status).toBe('PENDING');

    expect(createCheckout).toHaveBeenCalledTimes(1);
  });

  it('reuses checkout without creating another provider session', async () => {
    const result = await startOnline();

    const repeated =
      await checkoutService.startForSession(
        result.booking.token,
        result.requestId,
      );

    expect(repeated).toEqual(result.response);

    expect(createCheckout).toHaveBeenCalledTimes(1);

    expect(
      await prisma.payment.count(),
    ).toBe(1);
  });

  it('rejects an expired pending booking before creating checkout', async () => {
    const booking = await onlineRequest();

    await prisma.reservation.update({
      where: {
        id: booking.id,
      },
      data: {
        holdExpiresAt: new Date(Date.now() - 1),
      },
    });

    await expect(
      checkoutService.startForSession(
        booking.token,
        randomUUID(),
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(createCheckout).not.toHaveBeenCalled();

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });

  it('does not expose a checkout link after the hold expires', async () => {
    const result = await startOnline();

    await prisma.reservation.update({
      where: {
        id: result.booking.id,
      },
      data: {
        holdExpiresAt: new Date(Date.now() - 1),
      },
    });

    await expect(
      checkoutService.currentForSession(
        result.booking.token,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not allow pending property requests into online checkout', async () => {
    const created = await service.create(
      payload(),
    );

    await expect(
      checkoutService.startForSession(
        created.session.token,
        randomUUID(),
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(createCheckout).not.toHaveBeenCalled();
  });

  it('confirms a timely verified full payment and exposes the verified summary', async () => {
    const result = await startOnline();

    const outcome = await deliver(
      paidEvent(result.payment.id),
    );

    expect(outcome.outcome).toBe('PROCESSED');

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'CONFIRMED',
      holdExpiresAt: null,
      nightlyRateCentavos: 100000,
      totalAmountCentavos: 100000,
    });

    const stored =
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      });

    expect(stored.confirmedAt).toBeInstanceOf(Date);

    expect(
      await summaryService.forVerifiedBookingNumber(
        result.booking.reference,
      ),
    ).toMatchObject({
      reservationStatus: 'CONFIRMED',
      status: 'PAID',
      netPaidCentavos: 100000,
      balanceDueCentavos: 0,
      requiresReview: false,
    });

    expect(
      await checkoutService.currentForSession(
        result.booking.token,
      ),
    ).toMatchObject({
      state: 'PAID',
      checkoutUrl: null,
    });

    expect(
      await prisma.auditLog.count({
        where: {
          entityId: result.booking.id,
          action:
            'reservation.online_payment_confirmed',
        },
      }),
    ).toBe(1);
  });

  it('preserves an early webhook before checkout creation finishes', async () => {
    createCheckout.mockImplementationOnce(
      async (input) => {
        const outcome = await deliver(
          paidEvent(input.paymentId),
        );

        expect(outcome.outcome).toBe('PROCESSED');

        return {
          id: 'cs_guest_online',
          url:
            'https://checkout.paymongo.com/guest-online',
        };
      },
    );

    const result = await startOnline();

    expect(result.response.state).toBe('PAID');

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'CONFIRMED',
    });

    expect(
      await prisma.payment.count({
        where: {
          status: 'PAID',
        },
      }),
    ).toBe(1);
  });

  it('keeps retries from repeating confirmation', async () => {
    const result = await startOnline();

    const event = paidEvent(result.payment.id);

    expect(
      (await deliver(event)).outcome,
    ).toBe('PROCESSED');

    expect(
      (await deliver(event)).outcome,
    ).toBe('DUPLICATE');

    expect(
      await prisma.auditLog.count({
        where: {
          entityId: result.booking.id,
          action:
            'reservation.online_payment_confirmed',
        },
      }),
    ).toBe(1);
  });

  it('confirms once across competing webhook database clients', async () => {
    const result = await startOnline();
    const event = paidEvent(result.payment.id);

    const other = new PaymongoWebhookService(
      await openClient(),
    );

    const outcomes = await Promise.all([
      deliver(event),
      deliver(event, other),
    ]);

    expect(
      outcomes.map((result) => result.outcome).sort(
        (first, second) =>
          first.localeCompare(second),
      ),
    ).toEqual([
      'DUPLICATE',
      'PROCESSED',
    ]);

    expect(
      await prisma.auditLog.count({
        where: {
          entityId: result.booking.id,
          action:
            'reservation.online_payment_confirmed',
        },
      }),
    ).toBe(1);
  });

  it.each([
    ['wrong amount', 99999, 'PHP'],
    ['wrong currency', 100000, 'USD'],
  ] as const)('does not confirm a %s event', async (
    _description,
    amount,
    currency,
  ) => {
    const result = await startOnline();

    const outcome = await deliver(
      paidEvent(
        result.payment.id,
        undefined,
        amount,
        currency,
      ),
    );

    expect(outcome.outcome).toBe('REVIEW_REQUIRED');

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });

    expect(
      await prisma.payment.findUniqueOrThrow({
        where: {
          id: result.payment.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
    });
  });

  it('retains a late capture for review without confirming', async () => {
    const result = await startOnline();

    await prisma.reservation.update({
      where: {
        id: result.booking.id,
      },
      data: {
        holdExpiresAt: new Date(Date.now() - 1),
      },
    });

    const outcome = await deliver(
      paidEvent(result.payment.id),
    );

    expect(outcome.outcome).toBe('REVIEW_REQUIRED');

    expect(
      await prisma.payment.findUniqueOrThrow({
        where: {
          id: result.payment.id,
        },
      }),
    ).toMatchObject({
      status: 'PAID',
    });

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });

    expect(
      await summaryService.forVerifiedBookingNumber(
        result.booking.reference,
      ),
    ).toMatchObject({
      status: 'REVIEW_REQUIRED',
      requiresReview: true,
    });
  });

  it.each([
    'CANCELLED',
    'EXPIRED',
  ] as const)('never revives a %s booking', async (status) => {
    const result = await startOnline();

    await prisma.reservation.update({
      where: {
        id: result.booking.id,
      },
      data: {
        status,
      },
    });

    expect(
      (
        await deliver(
          paidEvent(result.payment.id),
        )
      ).outcome,
    ).toBe('REVIEW_REQUIRED');

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status,
      confirmedAt: null,
    });
  });

  it('retains a verified capture when inventory needs review', async () => {
    const result = await startOnline();

    await prisma.room.updateMany({
      data: {
        isActive: false,
      },
    });

    expect(
      (
        await deliver(
          paidEvent(result.payment.id),
        )
      ).outcome,
    ).toBe('REVIEW_REQUIRED');

    expect(
      await prisma.payment.findUniqueOrThrow({
        where: {
          id: result.payment.id,
        },
      }),
    ).toMatchObject({
      status: 'PAID',
    });

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });
  });

  it('rolls back payment, proof, and confirmation when confirmation auditing fails', async () => {
    const result = await startOnline();

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_online_confirmation"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'reservation.online_payment_confirmed'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic audit failure');
      END
    `);

    await expect(
      deliver(paidEvent(result.payment.id)),
    ).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(
      await prisma.payment.findUniqueOrThrow({
        where: {
          id: result.payment.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      paidAt: null,
    });

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: result.booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });

    expect(
      await prisma.paymentEvent.count(),
    ).toBe(0);
  });

    describe('deadline processing', () => {
    let expirationAdapter:
      PaymongoCheckoutExpirationAdapter;

    let closeSession: MockInstance<
      PaymongoCheckoutExpirationAdapter['close']
    >;

    let deadlines: GuestBookingDeadlineService;

    beforeEach(() => {
      expirationAdapter =
        new PaymongoCheckoutExpirationAdapter();

      closeSession = vi.spyOn(
        expirationAdapter,
        'close',
      );

      closeSession.mockResolvedValue('EXPIRED');

      deadlines =
        new GuestBookingDeadlineService(
          prisma,
          expirationAdapter,
        );
    });

    async function overdueOnline() {
      const result = await startOnline();

      await prisma.reservation.update({
        where: {
          id: result.booking.id,
        },
        data: {
          holdExpiresAt:
            new Date(Date.now() - 1),
        },
      });

      return result;
    }

    it('expires a local hold and closes its stored session', async () => {
      const result = await overdueOnline();

      const processed =
        await deadlines.runOnce();

      expect(processed.expiredCount).toBe(1);
      expect(processed.closedSessions).toBe(1);

      expect(closeSession).toHaveBeenCalledWith({
        paymentId: result.payment.id,
        checkoutSessionId:
          'cs_guest_online',
      });

      expect(
        await prisma.reservation.findUniqueOrThrow({
          where: {
            id: result.booking.id,
          },
        }),
      ).toMatchObject({
        status: 'EXPIRED',
      });

      expect(
        await prisma.payment.findUniqueOrThrow({
          where: {
            id: result.payment.id,
          },
        }),
      ).toMatchObject({
        status: 'PENDING',
        checkoutUrl: null,
      });
    });

    it('does not repeat an acknowledged expiration', async () => {
      await overdueOnline();

      await deadlines.runOnce();
      await deadlines.runOnce();

      expect(closeSession).toHaveBeenCalledTimes(1);

      expect(
        await prisma.auditLog.count({
          where: {
            action:
              'payment.checkout.expiration_confirmed',
          },
        }),
      ).toBe(1);
    });

    it('retains uncertain provider results for a later pass', async () => {
      const result = await overdueOnline();

      closeSession.mockRejectedValueOnce(
        new ServiceUnavailableException(
          'Synthetic timeout.',
        ),
      );

      const first = await deadlines.runOnce();

      expect(first.retrySessions).toBe(1);

      const second = await deadlines.runOnce();

      expect(second.closedSessions).toBe(1);

      expect(closeSession).toHaveBeenCalledTimes(2);

      expect(
        await prisma.payment.findUniqueOrThrow({
          where: {
            id: result.payment.id,
          },
        }),
      ).toMatchObject({
        status: 'PENDING',
        paidAt: null,
      });
    });

    it('retains missing session IDs and processes them when learned later', async () => {
      const result = await overdueOnline();

      await prisma.payment.update({
        where: {
          id: result.payment.id,
        },
        data: {
          providerCheckoutId: null,
          checkoutState: 'UNKNOWN',
          checkoutUrl: null,
        },
      });

      const first = await deadlines.runOnce();

      expect(first.unknownSessions).toBe(1);
      expect(closeSession).not.toHaveBeenCalled();

      await prisma.payment.update({
        where: {
          id: result.payment.id,
        },
        data: {
          providerCheckoutId:
            'cs_guest_online',
        },
      });

      const second = await deadlines.runOnce();

      expect(second.closedSessions).toBe(1);
      expect(second.unknownSessions).toBe(0);
    });

    it('routes ambiguous provider sessions to review without recording payment', async () => {
      const result = await overdueOnline();

      closeSession.mockResolvedValueOnce(
        'REVIEW_REQUIRED',
      );

      const processed =
        await deadlines.runOnce();

      expect(processed.reviewSessions).toBe(1);

      await deadlines.runOnce();

      expect(closeSession).toHaveBeenCalledTimes(1);

      expect(
        await prisma.payment.findUniqueOrThrow({
          where: {
            id: result.payment.id,
          },
        }),
      ).toMatchObject({
        status: 'PENDING',
        paidAt: null,
      });

      expect(
        await summaryService.forVerifiedBookingNumber(
          result.booking.reference,
        ),
      ).toMatchObject({
        requiresReview: true,
      });
    });

    it('leaves a verified confirmed booking untouched', async () => {
      const result = await startOnline();

      await deliver(
        paidEvent(result.payment.id),
      );

      await deadlines.runOnce();

      expect(closeSession).not.toHaveBeenCalled();

      expect(
        await prisma.reservation.findUniqueOrThrow({
          where: {
            id: result.booking.id,
          },
        }),
      ).toMatchObject({
        status: 'CONFIRMED',
      });
    });

    it('retains a late webhook after provider expiration without reviving the booking', async () => {
      const result = await overdueOnline();

      await deadlines.runOnce();

      const outcome = await deliver(
        paidEvent(result.payment.id),
      );

      expect(outcome.outcome).toBe(
        'REVIEW_REQUIRED',
      );

      expect(
        await prisma.reservation.findUniqueOrThrow({
          where: {
            id: result.booking.id,
          },
        }),
      ).toMatchObject({
        status: 'EXPIRED',
        confirmedAt: null,
      });

      expect(
        await prisma.payment.findUniqueOrThrow({
          where: {
            id: result.payment.id,
          },
        }),
      ).toMatchObject({
        status: 'PAID',
      });
    });

    it('processes overdue property confirmation requests without a provider call', async () => {
      const created = await service.create(
        payload(),
      );

      const booking =
        await prisma.reservation.findUniqueOrThrow({
          where: {
            reservationNumber:
              created.receipt.reservationNumber,
          },
        });

      const arrival = new Date(
        Date.now() - 31 * 60 * 1000,
      );

      await prisma.reservation.update({
        where: {
          id: booking.id,
        },
        data: {
          expectedArrivalAt: arrival,
          holdExpiresAt: new Date(
            arrival.getTime() +
              30 * 60 * 1000,
          ),
        },
      });

      const processed =
        await deadlines.runOnce();

      expect(processed.cancelledCount).toBe(1);

      expect(closeSession).not.toHaveBeenCalled();

      expect(
        await prisma.reservation.findUniqueOrThrow({
          where: {
            id: booking.id,
          },
        }),
      ).toMatchObject({
        status: 'CANCELLED',
      });
    });

    it('retries after provider success but acknowledgment persistence fails', async () => {
      await overdueOnline();

      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER "reject_expiration_ack"
        BEFORE INSERT ON "AuditLog"
        WHEN NEW.action = 'payment.checkout.expiration_confirmed'
        BEGIN
          SELECT RAISE(ABORT, 'synthetic acknowledgment failure');
        END
      `);

      await expect(
        deadlines.runOnce(),
      ).rejects.toThrow();

      expect(
        await prisma.auditLog.count({
          where: {
            action:
              'payment.checkout.expiration_confirmed',
          },
        }),
      ).toBe(0);

      await prisma.$executeRawUnsafe(
        'DROP TRIGGER "reject_expiration_ack"',
      );

      const retried =
        await deadlines.runOnce();

      expect(retried.closedSessions).toBe(1);

      expect(closeSession).toHaveBeenCalledTimes(2);
    });
  });
});

describe('staff confirmation of property requests', () => {
  let staffService: GuestBookingStaffService;
  let actor: AuthenticatedUser;

  beforeEach(async () => {
    const role = await prisma.role.create({
      data: {
        name: 'ADMIN',
      },
    });

    const user = await prisma.user.create({
      data: {
        roleId: role.id,
        name: 'Synthetic staff',
        email: 'staff-confirmation@example.invalid',
        passwordHash: 'synthetic-not-a-login-password',
        status: 'ACTIVE',
      },
    });

    actor = {
      id: user.id,
      email: user.email,
      role: role.name,
    };

    staffService = new GuestBookingStaffService(prisma);
  });

  async function request() {
    const input = payload();

    await service.create(input);

    const attempt =
      await prisma.guestBookingAttempt.findUniqueOrThrow({
        where: {
          requestId: input.requestId,
        },
      });

    if (!attempt.reservationId) {
      throw new Error('Synthetic reservation is missing.');
    }

    return prisma.reservation.findUniqueOrThrow({
      where: {
        id: attempt.reservationId,
      },
    });
  }

  async function makeOverdue(reservationId: string) {
    const arrival = new Date(
      Date.now() - 31 * 60 * 1000,
    );

    await prisma.reservation.update({
      where: {
        id: reservationId,
      },
      data: {
        expectedArrivalAt: arrival,
        firstContactedAt: null,
        responseDeadlineAt: null,
        holdExpiresAt: new Date(
          arrival.getTime() + 30 * 60 * 1000,
        ),
      },
    });
  }

  it('starts the response window when contact is first recorded', async () => {
    const booking = await request();
    const before = Date.now();

    const result = await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    expect(result.status).toBe('PENDING');

    expect(
      result.firstContactedAt?.getTime(),
    ).toBeGreaterThanOrEqual(before);

    expect(
      result.firstContactedAt?.getTime(),
    ).toBeLessThanOrEqual(Date.now());

    expect(
      result.responseDeadlineAt?.getTime(),
    ).toBe(
      result.firstContactedAt!.getTime() +
        24 * 60 * 60 * 1000,
    );

    expect(result.holdExpiresAt).toEqual(
      result.responseDeadlineAt,
    );
  });

  it('does not extend deadlines when another contact is recorded', async () => {
    const booking = await request();

    const first = await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    const second = await staffService.contact(
      actor,
      booking.id,
      'EMAIL',
    );

    expect(second.firstContactedAt).toEqual(
      first.firstContactedAt,
    );

    expect(second.responseDeadlineAt).toEqual(
      first.responseDeadlineAt,
    );

    expect(second.holdExpiresAt).toEqual(
      first.holdExpiresAt,
    );

    expect(
      await prisma.auditLog.count({
        where: {
          entityId: booking.id,
          action: 'reservation.guest_contact_recorded',
        },
      }),
    ).toBe(2);
  });

  it('uses arrival grace when it is earlier than the response deadline', async () => {
    const booking = await request();

    const arrival = new Date(
      Date.now() + 60 * 60 * 1000,
    );

    const arrivalDeadline = new Date(
      arrival.getTime() + 30 * 60 * 1000,
    );

    await prisma.reservation.update({
      where: {
        id: booking.id,
      },
      data: {
        expectedArrivalAt: arrival,
        holdExpiresAt: arrivalDeadline,
      },
    });

    const result = await staffService.contact(
      actor,
      booking.id,
      'EMAIL',
    );

    expect(result.holdExpiresAt).toEqual(
      arrivalDeadline,
    );

    expect(
      result.responseDeadlineAt!.getTime(),
    ).toBeGreaterThan(
      arrivalDeadline.getTime(),
    );
  });

  it('requires contact before confirmation', async () => {
    const booking = await request();

    await expect(
      staffService.confirm(
        actor,
        booking.id,
        true,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });
  });

    it('requires explicit guest agreement', async () => {
    const booking = await request();

    await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    expect(() =>
      staffService.confirm(
        actor,
        booking.id,
        false,
      ),
    ).toThrow(BadRequestException);
  });

  it.each([
    'ADMIN',
    'MANAGER',
    'RECEPTIONIST',
  ])('allows an active %s to confirm without recording payment', async (roleName) => {
    const role = await prisma.role.upsert({
      where: {
        name: roleName,
      },
      create: {
        name: roleName,
      },
      update: {},
    });

    await prisma.user.update({
      where: {
        id: actor.id,
      },
      data: {
        roleId: role.id,
      },
    });

    actor = {
      ...actor,
      role: roleName,
    };

    const booking = await request();

    await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    const result = await staffService.confirm(
      actor,
      booking.id,
      true,
    );

    expect(result.status).toBe('CONFIRMED');
    expect(result.confirmedAt).toBeInstanceOf(Date);
    expect(result.holdExpiresAt).toBeNull();

    expect(
      await prisma.payment.count(),
    ).toBe(0);

    const stored =
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      });

    expect(stored.nightlyRateCentavos).toBe(
      booking.nightlyRateCentavos,
    );

    expect(stored.totalAmountCentavos).toBe(
      booking.totalAmountCentavos,
    );
  });

  it('rejects a disabled staff account', async () => {
    const booking = await request();

    await prisma.user.update({
      where: {
        id: actor.id,
      },
      data: {
        status: 'DISABLED',
      },
    });

    await expect(
      staffService.contact(
        actor,
        booking.id,
        'PHONE',
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects stale staff permissions', async () => {
    const booking = await request();

    const guestRole = await prisma.role.create({
      data: {
        name: 'GUEST',
      },
    });

    await prisma.user.update({
      where: {
        id: actor.id,
      },
      data: {
        roleId: guestRole.id,
      },
    });

    await expect(
      staffService.contact(
        actor,
        booking.id,
        'EMAIL',
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

    it('rejects unsupported contact channels', async () => {
    const booking = await request();

    expect(() =>
      staffService.contact(
        actor,
        booking.id,
        'SMS',
      ),
    ).toThrow(BadRequestException);
  });

  it('does not apply property confirmation to online bookings', async () => {
    const input = payload();

    input.paymentPreference = 'PAYMONGO';

    await service.create(input);

    const attempt =
      await prisma.guestBookingAttempt.findUniqueOrThrow({
        where: {
          requestId: input.requestId,
        },
      });

    await expect(
      staffService.contact(
        actor,
        attempt.reservationId!,
        'PHONE',
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('saves overdue cancellation before rejecting confirmation', async () => {
    const booking = await request();

    const room = await prisma.room.findFirstOrThrow();

    await prisma.roomAssignment.create({
      data: {
        reservationId: booking.id,
        roomId: room.id,
      },
    });

    await makeOverdue(booking.id);

    await expect(
      staffService.confirm(
        actor,
        booking.id,
        true,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      }),
    ).toMatchObject({
      status: 'CANCELLED',
      confirmedAt: null,
    });

    expect(
      await prisma.roomAssignment.count({
        where: {
          reservationId: booking.id,
          releasedAt: null,
        },
      }),
    ).toBe(0);

    expect(
      await prisma.auditLog.count({
        where: {
          entityId: booking.id,
          action:
            'reservation.pending_confirmation_cancelled',
        },
      }),
    ).toBe(1);
  });

  it('rejects a pending request and preserves its reason', async () => {
    const booking = await request();

    const first = await staffService.reject(
      actor,
      booking.id,
      'Guest declined the stay.',
    );

    const second = await staffService.reject(
      actor,
      booking.id,
      'A different retry reason.',
    );

    expect(first.status).toBe('CANCELLED');
    expect(second.status).toBe('CANCELLED');

    const events = await prisma.auditLog.findMany({
      where: {
        entityId: booking.id,
        action: 'reservation.guest_request_rejected',
      },
    });

    expect(events).toHaveLength(1);

    expect(
      JSON.parse(events[0].detailsJson!),
    ).toMatchObject({
      reason: 'Guest declined the stay.',
    });

    await expect(
      staffService.confirm(
        actor,
        booking.id,
        true,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('records one confirmation across competing clients', async () => {
    const booking = await request();

    await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    const other = new GuestBookingStaffService(
      await openClient(),
    );

    const results = await Promise.all([
      staffService.confirm(
        actor,
        booking.id,
        true,
      ),
      other.confirm(
        actor,
        booking.id,
        true,
      ),
    ]);

    expect(
      results.every(
        (result) => result.status === 'CONFIRMED',
      ),
    ).toBe(true);

    expect(
      await prisma.auditLog.count({
        where: {
          entityId: booking.id,
          action: 'reservation.guest_request_confirmed',
        },
      }),
    ).toBe(1);
  });

  it('rechecks inventory and rolls back an unsafe confirmation', async () => {
    const booking = await request();

    await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    await prisma.room.updateMany({
      data: {
        isActive: false,
      },
    });

    await expect(
      staffService.confirm(
        actor,
        booking.id,
        true,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });
  });

  it('rolls back contact timing when its audit fails', async () => {
    const booking = await request();

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_contact_audit"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'reservation.guest_contact_recorded'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic audit failure');
      END
    `);

    await expect(
      staffService.contact(
        actor,
        booking.id,
        'PHONE',
      ),
    ).rejects.toThrow();

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      firstContactedAt: null,
      responseDeadlineAt: null,
      holdExpiresAt: booking.holdExpiresAt,
    });
  });

  it('rolls back confirmation when its audit fails', async () => {
    const booking = await request();

    await staffService.contact(
      actor,
      booking.id,
      'PHONE',
    );

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_confirmation_audit"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'reservation.guest_request_confirmed'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic audit failure');
      END
    `);

    await expect(
      staffService.confirm(
        actor,
        booking.id,
        true,
      ),
    ).rejects.toThrow();

    expect(
      await prisma.reservation.findUniqueOrThrow({
        where: {
          id: booking.id,
        },
      }),
    ).toMatchObject({
      status: 'PENDING',
      confirmedAt: null,
    });
  });
});