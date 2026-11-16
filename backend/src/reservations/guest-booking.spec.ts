import { PaymentReconciliationService } from '../payments/payment-reconciliation.service.js';
import { PaymongoReconciliationAdapter } from '../payments/paymongo-reconciliation.adapter.js';
import { RefundsService } from '../payments/refunds.service.js';
import { PaymongoRefundAdapter } from '../payments/paymongo-refund.adapter.js';
import { FINANCIAL_EXCEPTION_EVENT } from '../payments/financial-exceptions.js';
import { requireFullRecordedPayment } from './stay-payment-policy.js';
import { AvailabilityService } from '../availability/availability.service.js';
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
  UnauthorizedException,
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
} from './reservation-crypto.js';

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
let guestIdentity: AuthenticatedUser;
let guestProfileId: string;

async function createGuestFixture() {
  const role = await prisma.role.upsert({
    where: { name: 'GUEST' },
    update: {},
    create: { name: 'GUEST' },
  });
  const user = await prisma.user.create({
    data: {
      roleId: role.id,
      name: 'Synthetic Guest',
      email: 'guest-booking@example.invalid',
      passwordHash: 'synthetic-unused-password-hash',
      status: 'ACTIVE',
      mustChangePassword: false,
      sessionVersion: 0,
    },
  });
  const guest = await prisma.guest.create({
    data: {
      userId: user.id,
      firstName: 'Synthetic',
      lastName: 'Guest',
      email: user.email,
    },
  });
  guestProfileId = guest.id;
  guestIdentity = {
    id: user.id,
    email: user.email,
    role: 'GUEST',
  };
}

function createGuestBooking(bookingService: GuestBookingService, input: unknown) {
  return bookingService.create(input, guestIdentity);
}

function recoverGuestBooking(
  bookingService: GuestBookingService,
  requestId: unknown,
  recoveryToken: unknown,
) {
  return bookingService.recover(requestId, recoveryToken, guestIdentity);
}

async function reservationIdFor(receipt: { reservationNumber: string }) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { reservationNumber: receipt.reservationNumber },
    select: { id: true },
  });
  return reservation.id;
}

function startGuestCheckout(
  checkout: CheckoutService,
  reservationId: string,
  requestId: string,
) {
  return checkout.startForUser(reservationId, requestId, guestIdentity);
}

function currentGuestCheckout(checkout: CheckoutService, reservationId: string) {
  return checkout.currentForUser(reservationId, guestIdentity);
}

async function readGuestSummary(summaries: PaymentSummaryService, reference: string) {
  const id = await reservationIdFor({ reservationNumber: reference });
  return summaries.forUser(id, guestIdentity);
}

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
  await createGuestFixture();

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
  it('requires an authenticated identity for creation', async () => {
    await expect(
      service.create(payload(), undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await prisma.reservation.count()).toBe(0);
  });

  it('rejects recovery when the account identity changes', async () => {
    const input = payload();
    await createGuestBooking(service, input);
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'GUEST' } });
    const otherUser = await prisma.user.create({
      data: {
        roleId: role.id,
        name: 'Other Guest',
        email: 'other-guest@example.invalid',
        passwordHash: 'synthetic-unused-password-hash',
        status: 'ACTIVE',
      },
    });
    await prisma.guest.create({
      data: {
        userId: otherUser.id,
        firstName: 'Other',
        lastName: 'Guest',
        email: otherUser.email,
      },
    });
    await expect(service.recover(input.requestId, input.recoveryToken, {
      id: otherUser.id,
      email: otherUser.email,
      role: 'GUEST',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(await prisma.reservation.count()).toBe(1);
  });

  it('creates a pending property request owned by the guest account', async () => {
    const input = payload();

    const result = await createGuestBooking(service, input);

    expect(result.status).toBe('PENDING');

    expect(
      result.paymentPreference,
    ).toBe('PAY_AT_PROPERTY');

    expect(
      result.holdExpiresAt,
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
      hash(JSON.stringify([
        'guest-account-booking-v1',
        guestIdentity.id,
        input.requestId,
        hash(input.recoveryToken),
      ])),
    );

    expect(attempt.recoveryTokenHash).not.toBe(
      input.recoveryToken,
    );

    const reservation = await prisma.reservation.findUniqueOrThrow({
      where: { id: attempt.reservationId! },
      include: { guest: true },
    });
    expect(reservation.guestId).toBe(guestProfileId);
    expect(reservation.guest.userId).toBe(guestIdentity.id);
    expect(await prisma.reservationAccessSession.count()).toBe(0);
  });

  it('replays the original request without another guest or reservation', async () => {
    const input = payload();

    const first = await createGuestBooking(service, input);
    const second = await createGuestBooking(service, input);

    expect(second.replayed).toBe(true);

    expect(
      second.reservationNumber,
    ).toBe(first.reservationNumber);

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

    await createGuestBooking(service, input);

    input.guests = 2;

    await expect(
      createGuestBooking(service, input),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('requires the recovery credential, not only the request ID', async () => {
    const input = payload();

    await createGuestBooking(service, input);

    await expect(
      recoverGuestBooking(service,
        input.requestId,
        randomBytes(32).toString('hex'),
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('recovers the stored booking without creating another reservation', async () => {
    const input = payload();

    const created = await createGuestBooking(service, input);

    const recovered = await recoverGuestBooking(service,
      input.requestId,
      input.recoveryToken,
    );

    expect(
      recovered.reservationNumber,
    ).toBe(created.reservationNumber);

    expect(
      await prisma.reservation.count(),
    ).toBe(1);
  });

  it('rejects an expired recovery credential', async () => {
    const input = payload();

    await createGuestBooking(service, input);

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
      recoverGuestBooking(service,
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

    const result = await createGuestBooking(service, input);

    expect(result.status).toBe(
      'PENDING',
    );

    expect(
      result.holdExpiresAt?.getTime(),
    ).toBeGreaterThanOrEqual(
      before + HOLD_DURATION_MS,
    );

    expect(
      result.holdExpiresAt?.getTime(),
    ).toBeLessThanOrEqual(
      Date.now() + HOLD_DURATION_MS,
    );

    expect(
      await prisma.payment.count(),
    ).toBe(0);
  });

  it('binds recovery proofs to their request IDs', async () => {
    const firstInput = payload();
    const first = await createGuestBooking(service, firstInput);
    const secondInput = payload();

    secondInput.recoveryToken = firstInput.recoveryToken;

    secondInput.checkIn = new Date(
      Date.parse(firstInput.checkIn) + 2 * DAY_MS,
    ).toISOString().slice(0, 10);

    secondInput.checkOut = new Date(
      Date.parse(firstInput.checkOut) + 2 * DAY_MS,
    ).toISOString().slice(0, 10);
    const second = await createGuestBooking(service, secondInput);
    expect(second.reservationNumber).not.toBe(first.reservationNumber);
    const firstAttempt = await prisma.guestBookingAttempt.findUniqueOrThrow({
      where: { requestId: firstInput.requestId },
    });
    const secondAttempt = await prisma.guestBookingAttempt.findUniqueOrThrow({
      where: { requestId: secondInput.requestId },
    });
    expect(firstAttempt.recoveryTokenHash).not.toBe(secondAttempt.recoveryTokenHash);
    expect(await prisma.reservation.count()).toBe(2);
    expect(await prisma.guest.count()).toBe(1);
  });

  it('creates one reservation across concurrent identical requests', async () => {
    const input = payload();

    const other = makeService(
      await openClient(),
    );

    const results = await Promise.all([
      createGuestBooking(service, input),
      createGuestBooking(other, input),
    ]);

    expect(
      new Set(
        results.map(
          (result) =>
            result.reservationNumber,
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
      createGuestBooking(service, payload()),
      createGuestBooking(other, payload()),
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

  it('rolls back booking writes and preserves the account profile when auditing fails', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_guest_booking_audit"
      BEFORE INSERT ON "AuditLog"
      WHEN NEW.action = 'reservation.guest_booking_requested'
      BEGIN
        SELECT RAISE(ABORT, 'synthetic audit failure');
      END
    `);

    await expect(
      createGuestBooking(service, payload()),
    ).rejects.toThrow();

    expect(
      await prisma.guestBookingAttempt.count(),
    ).toBe(0);

    expect(
      await prisma.reservation.count(),
    ).toBe(0);

    expect(
      await prisma.guest.count(),
    ).toBe(1);

    expect(await prisma.guest.findUnique({
      where: { id: guestProfileId },
    })).not.toBeNull();

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

    const created = await createGuestBooking(service, input);

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
        created.reservationNumber,
    };
  }

  async function startOnline() {
    const booking = await onlineRequest();
    const requestId = randomUUID();

    const response =
      await startGuestCheckout(checkoutService,
        booking.id,
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
      await startGuestCheckout(checkoutService,
        result.booking.id,
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
      startGuestCheckout(checkoutService,
        booking.id,
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
      currentGuestCheckout(checkoutService,
        result.booking.id,
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not allow pending property requests into online checkout', async () => {
    const created = await createGuestBooking(service,
      payload(),
    );

    await expect(
      startGuestCheckout(checkoutService,
        await reservationIdFor(created),
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
      await readGuestSummary(summaryService,
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
      await currentGuestCheckout(checkoutService,
        result.booking.id,
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
      await readGuestSummary(summaryService,
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

  describe('verified unpaid checkout replacement', () => {
    let close: MockInstance<PaymongoCheckoutExpirationAdapter['close']>;
    beforeEach(() => {
      close = vi.spyOn(PaymongoCheckoutExpirationAdapter.prototype, 'close').mockResolvedValue('EXPIRED');
    });

    async function replace(result: Awaited<ReturnType<typeof startOnline>>, requestId = randomUUID()) {
      createCheckout.mockResolvedValueOnce({
        id: 'cs_retry_' + randomBytes(12).toString('hex'),
        url: 'https://checkout.paymongo.com/replacement',
      });
      return checkoutService.retryForUser(result.booking.id, result.payment.id, requestId, guestIdentity);
    }

    it('keeps the original hold, preserves history, confirms the replacement, and permits recorded-payment verification', async () => {
      const result = await startOnline();
      const before = await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } });
      expect((await replace(result)).state).toBe('READY');
      const previous = await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } });
      expect(previous.status).toBe('FAILED');
      expect(previous.providerCheckoutId).toBe('cs_guest_online');
      const next = await prisma.payment.findFirstOrThrow({ where: { reservationId: result.booking.id, status: 'PENDING' } });
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).holdExpiresAt).toEqual(before.holdExpiresAt);
      const event = paidEvent(next.id);
      event.data.attributes.data.id = next.providerCheckoutId!;
      expect((await deliver(event)).outcome).toBe('PROCESSED');
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe('CONFIRMED');
      expect(await prisma.$transaction((tx) => requireFullRecordedPayment(tx, result.booking.id, 100000, new Date()))).toBe(100000);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('reuses the replacement on repeated and concurrent stale retry requests', async () => {
      const result = await startOnline();
      await Promise.all([replace(result), replace(result)]);
      await checkoutService.retryForUser(result.booking.id, result.payment.id, randomUUID(), guestIdentity);
      expect(createCheckout).toHaveBeenCalledTimes(2);
      expect(await prisma.payment.count({ where: { reservationId: result.booking.id, status: 'PENDING' } })).toBe(1);
      expect(await prisma.paymentEvent.count({ where: { paymentId: result.payment.id, eventType: 'nexora.checkout.closed_unpaid' } })).toBe(1);
    });

    it('supports more than one retired attempt while retaining the same deadline', async () => {
      const result = await startOnline();
      const before = await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } });
      await replace(result);
      const middle = await prisma.payment.findFirstOrThrow({ where: { reservationId: result.booking.id, status: 'PENDING' } });
      createCheckout.mockResolvedValueOnce({
        id: 'cs_third_attempt', url: 'https://checkout.paymongo.com/third-attempt',
      });
      await checkoutService.retryForUser(result.booking.id, middle.id, randomUUID(), guestIdentity);
      expect(await prisma.payment.count({ where: { reservationId: result.booking.id, status: 'FAILED' } })).toBe(2);
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).holdExpiresAt).toEqual(before.holdExpiresAt);
      const current = await prisma.payment.findFirstOrThrow({ where: { reservationId: result.booking.id, status: 'PENDING' } });
      const event = paidEvent(current.id);
      event.data.attributes.data.id = current.providerCheckoutId!;
      expect((await deliver(event)).outcome).toBe('PROCESSED');
    });

    it('does not reserve a replacement if the hold expires during provider closure', async () => {
      const result = await startOnline();
      close.mockImplementationOnce(async () => {
        await prisma.reservation.update({
          where: { id: result.booking.id }, data: { holdExpiresAt: new Date(Date.now() - 1) },
        });
        return 'EXPIRED';
      });
      await expect(replace(result)).rejects.toBeInstanceOf(ConflictException);
      expect(await prisma.payment.count()).toBe(1);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('PENDING');
    });

    it('never creates a replacement for unknown closure or missing session identity', async () => {
      const result = await startOnline();
      close.mockRejectedValueOnce(new ServiceUnavailableException('Synthetic timeout.'));
      await expect(replace(result)).rejects.toBeInstanceOf(ConflictException);
      expect(await prisma.payment.count()).toBe(1);
      await prisma.payment.update({
        where: { id: result.payment.id }, data: { providerCheckoutId: null, checkoutState: 'UNKNOWN' },
      });
      await expect(replace(result)).rejects.toBeInstanceOf(ConflictException);
      expect(close).toHaveBeenCalledTimes(1);
      expect(createCheckout).toHaveBeenCalledTimes(1);
    });

    it('retains conflicting provider evidence even if a concurrent retry already retired the old attempt', async () => {
      const result = await startOnline();
      close.mockImplementationOnce(async () => {
        close.mockResolvedValue('EXPIRED');
        await checkoutService.retryForUser(result.booking.id, result.payment.id, randomUUID(), guestIdentity);
        return 'REVIEW_REQUIRED';
      });
      await expect(replace(result)).rejects.toBeInstanceOf(ConflictException);
      expect(await prisma.payment.count()).toBe(2);
      expect((await readGuestSummary(summaryService, result.booking.reference)).requiresReview).toBe(true);
    });

    it('retains ambiguous provider evidence for review instead of replacing', async () => {
      const result = await startOnline();
      close.mockResolvedValueOnce('REVIEW_REQUIRED');
      await expect(replace(result)).rejects.toBeInstanceOf(ConflictException);
      expect(await prisma.payment.count()).toBe(1);
      expect((await readGuestSummary(summaryService, result.booking.reference)).requiresReview).toBe(true);
    });

    it('does not replace when verified payment arrives during closure', async () => {
      const result = await startOnline();
      close.mockImplementationOnce(async () => {
        await deliver(paidEvent(result.payment.id));
        return 'EXPIRED';
      });
      expect((await replace(result)).state).toBe('PAID');
      expect(createCheckout).toHaveBeenCalledTimes(1);
      expect(await prisma.payment.count()).toBe(1);
    });

    it('retains a late retired-attempt payment for review and prevents replacement confirmation', async () => {
      const result = await startOnline();
      await replace(result);
      expect((await deliver(paidEvent(result.payment.id))).outcome).toBe('REVIEW_REQUIRED');
      const next = await prisma.payment.findFirstOrThrow({ where: { reservationId: result.booking.id, status: 'PENDING' } });
      const event = paidEvent(next.id);
      event.data.attributes.data.id = next.providerCheckoutId!;
      expect((await deliver(event)).outcome).toBe('REVIEW_REQUIRED');
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe('PENDING');
    });

    it('rolls back retirement if reserving the replacement fails', async () => {
      const result = await startOnline();
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_retry_claim BEFORE INSERT ON AuditLog
        WHEN NEW.action = 'payment.checkout.requested'
        BEGIN SELECT RAISE(ABORT, 'synthetic retry claim failure'); END
      `);
      await expect(replace(result)).rejects.toThrow();
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('PENDING');
      expect(await prisma.payment.count()).toBe(1);
      expect(await prisma.paymentEvent.count({ where: { eventType: 'nexora.checkout.closed_unpaid' } })).toBe(0);
    });

    it('expires a replacement hold using the original deadline and retired evidence', async () => {
      const result = await startOnline();
      await replace(result);
      await prisma.reservation.update({ where: { id: result.booking.id }, data: { holdExpiresAt: new Date(Date.now() - 1) } });
      const deadline = new GuestBookingDeadlineService(prisma, new PaymongoCheckoutExpirationAdapter());
      expect((await deadline.runOnce()).expiredCount).toBe(1);
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe('EXPIRED');
    });

    it('does not replace after hold expiry or for another guest', async () => {
      const result = await startOnline();
      await expect(checkoutService.retryForUser(result.booking.id, result.payment.id, randomUUID(), {
        ...guestIdentity, id: 'unrelated-guest',
      })).rejects.toBeInstanceOf(NotFoundException);
      await prisma.reservation.update({ where: { id: result.booking.id }, data: { holdExpiresAt: new Date(Date.now() - 1) } });
      await expect(replace(result)).rejects.toBeInstanceOf(ConflictException);
      expect(close).not.toHaveBeenCalled();
    });
  });

  describe('Super Admin financial exceptions', () => {
    let admin: AuthenticatedUser;
    let reconciliation: PaymentReconciliationService;
    let remote: MockInstance<PaymongoReconciliationAdapter['payment']>;

    beforeEach(async () => {
      const role = await prisma.role.upsert({
        where: { name: 'SUPER_ADMIN' }, create: { name: 'SUPER_ADMIN' }, update: {},
      });
      const user = await prisma.user.create({
        data: {
          roleId: role.id, name: 'Synthetic financial reviewer',
          email: randomUUID() + '@example.invalid',
          passwordHash: 'unused-test-hash', status: 'ACTIVE',
        },
      });
      admin = { id: user.id, email: user.email, role: 'SUPER_ADMIN' };
      const adapter = new PaymongoReconciliationAdapter();
      remote = vi.spyOn(adapter, 'payment').mockImplementation(async (id) => ({
        id, amountCentavos: 100000, currency: 'PHP', status: 'paid', refunds: 0,
      }));
      reconciliation = new PaymentReconciliationService(prisma, adapter, webhookService);
    });

    async function retiredCapture(confirmReplacement = true) {
      const result = await startOnline();
      vi.spyOn(PaymongoCheckoutExpirationAdapter.prototype, 'close').mockResolvedValue('EXPIRED');
      createCheckout.mockResolvedValueOnce({
        id: 'cs_financial_replacement',
        url: 'https://checkout.paymongo.com/financial-replacement',
      });
      await checkoutService.retryForUser(result.booking.id, result.payment.id, randomUUID(), guestIdentity);
      const next = await prisma.payment.findFirstOrThrow({
        where: { reservationId: result.booking.id, status: 'PENDING' },
      });
      if (confirmReplacement) {
        const event = paidEvent(next.id);
        event.data.attributes.data.id = next.providerCheckoutId!;
        event.data.attributes.data.attributes.payments[0].id = 'pay_financial_replacement';
        await deliver(event);
      }
      const event = paidEvent(result.payment.id);
      expect((await deliver(event)).outcome).toBe('REVIEW_REQUIRED');
      return { ...result, event, next };
    }

    function input(eventId: string) {
      return { requestId: randomUUID(), eventId, acknowledgeLateCapture: true };
    }

    it('records distinct captures once, queues excess, and preserves booking state', async () => {
      const result = await retiredCapture();
      const eventId = result.event.data.id;
      const evidence = await prisma.paymentEvent.findUniqueOrThrow({ where: { providerEventId: eventId } });
      const command = input(eventId);
      expect((await reconciliation.payment(result.payment.id, command, admin)).outcome).toBe('REVIEW_REQUIRED');
      expect((await reconciliation.payment(result.payment.id, command, admin)).alreadyReconciled).toBe(true);
      await reconciliation.payment(result.payment.id, input(eventId), admin);
      expect(remote).toHaveBeenCalledTimes(2);
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe('CONFIRMED');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('PAID');
      expect((await readGuestSummary(summaryService, result.booking.reference)).netPaidCentavos).toBe(200000);
      expect((await prisma.paymentEvent.findUniqueOrThrow({ where: { providerEventId: eventId } })).payloadJson).toBe(evidence.payloadJson);
      const queue = await reconciliation.list({ offset: 0, limit: 20 }, admin);
      expect(queue.events.some((event) => event.eventType === FINANCIAL_EXCEPTION_EVENT &&
        event.errorMessage === 'EXCESS_COLLECTION')).toBe(true);
    });

    it.each(['CANCELLED', 'EXPIRED'] as const)('records captured money without reviving %s', async (status) => {
      const result = await retiredCapture(false);
      await prisma.reservation.update({ where: { id: result.booking.id }, data: { status } });
      await reconciliation.payment(result.payment.id, input(result.event.data.id), admin);
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe(status);
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('PAID');
      expect((await prisma.paymentEvent.findUniqueOrThrow({
        where: { providerEventId: 'financial-exception:' + result.booking.id },
      })).errorMessage).toBe('CLOSED_BOOKING_CAPTURE');
      expect(await prisma.refund.count()).toBe(0);
    });

    it('keeps unfulfilled pending captures in review without automatic confirmation', async () => {
      const result = await retiredCapture(false);
      await reconciliation.payment(result.payment.id, input(result.event.data.id), admin);
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe('PENDING');
      expect((await readGuestSummary(summaryService, result.booking.reference)).requiresReview).toBe(true);
      expect((await prisma.paymentEvent.findUniqueOrThrow({
        where: { providerEventId: 'financial-exception:' + result.booking.id },
      })).errorMessage).toBe('UNFULFILLED_CAPTURE');
    });

    it('rejects ordinary staff, disabled reviewers, and mismatched provider money', async () => {
      const result = await retiredCapture();
      const command = input(result.event.data.id);
      await expect(reconciliation.payment(result.payment.id, command, { ...admin, role: 'MANAGER' }))
        .rejects.toBeInstanceOf(ForbiddenException);
      await prisma.user.update({ where: { id: admin.id }, data: { status: 'DISABLED' } });
      await expect(reconciliation.payment(result.payment.id, command, admin)).rejects.toBeInstanceOf(UnauthorizedException);
      await prisma.user.update({ where: { id: admin.id }, data: { status: 'ACTIVE' } });
      remote.mockResolvedValueOnce({
        id: 'pay_guest_online', amountCentavos: 100001, currency: 'PHP', status: 'paid', refunds: 0,
      });
      expect((await reconciliation.payment(result.payment.id, command, admin)).outcome).toBe('REVIEW_REQUIRED');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('FAILED');
    });

    it('does not promote an ordinary failed attempt without closure evidence', async () => {
      const result = await startOnline();
      await prisma.payment.update({ where: { id: result.payment.id }, data: { status: 'FAILED' } });
      const event = paidEvent(result.payment.id);
      await deliver(event);
      expect((await reconciliation.payment(result.payment.id, input(event.data.id), admin)).outcome).toBe('REVIEW_REQUIRED');
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('FAILED');
    });

    it('does not trust an unsigned capture record as provider evidence', async () => {
      const result = await retiredCapture();
      await prisma.paymentEvent.update({
        where: { providerEventId: result.event.data.id }, data: { signatureVerified: false },
      });
      expect((await reconciliation.payment(result.payment.id, input(result.event.data.id), admin)).outcome).toBe('REVIEW_REQUIRED');
      expect(remote).not.toHaveBeenCalled();
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('FAILED');
    });

    it('rolls back capture recording if the financial exception audit cannot be saved', async () => {
      const result = await retiredCapture();
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_financial_exception BEFORE INSERT ON AuditLog
        WHEN NEW.action = 'payment.financial_exception.opened'
        BEGIN SELECT RAISE(ABORT, 'synthetic financial audit failure'); END
      `);
      await expect(reconciliation.payment(result.payment.id, input(result.event.data.id), admin)).rejects.toThrow();
      expect((await prisma.payment.findUniqueOrThrow({ where: { id: result.payment.id } })).status).toBe('FAILED');
      expect((await prisma.paymentEvent.findUniqueOrThrow({ where: { providerEventId: result.event.data.id } })).errorMessage)
        .toBe('PAYMENT_STATE_REVIEW');
    });

    it('resolves excess only after an explicitly requested verified refund completes', async () => {
      const result = await retiredCapture();
      await reconciliation.payment(result.payment.id, input(result.event.data.id), admin);
      const adapter = new PaymongoRefundAdapter();
      vi.spyOn(adapter, 'secret').mockReturnValue('sk_test_synthetic_refund');
      const createRefund = vi.spyOn(adapter, 'create').mockImplementation(async (input) => ({
        id: 'ref_financial_correction', paymentId: input.paymentId, localRefundId: input.refundId,
        amountCentavos: input.amountCentavos, currency: 'PHP', livemode: false, status: 'COMPLETED',
      }));
      const refunds = new RefundsService(prisma, adapter);
      const command = { requestId: randomUUID(), amountCentavos: 100000, reason: 'duplicate' as const };
      await refunds.create(result.payment.id, command, admin);
      await refunds.create(result.payment.id, command, admin);
      expect(createRefund).toHaveBeenCalledTimes(1);
      expect(await prisma.refund.count()).toBe(1);
      const marker = await prisma.paymentEvent.findUniqueOrThrow({
        where: { providerEventId: 'financial-exception:' + result.booking.id },
      });
      expect(marker.status).toBe('PROCESSED');
      expect(marker.errorMessage).toBeNull();
      expect((await prisma.reservation.findUniqueOrThrow({ where: { id: result.booking.id } })).status).toBe('CONFIRMED');
    });
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

    async function expectProtected(reservationId: string) {
      expect(await prisma.reservation.findUniqueOrThrow({
        where: { id: reservationId },
      })).toMatchObject({ status: 'PENDING' });
      const input = payload();
      const availability = new AvailabilityService(prisma);
      expect(await availability.search({
        checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests,
      })).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: ROOM_TYPE_ID, available: false }),
      ]));
      // A fresh request must check inventory, rather than reuse an expired hold.
      await expect(createGuestBooking(service, payload()))
        .rejects.toBeInstanceOf(ConflictException);
    }

    it('keeps the original deadline when an active checkout is retried', async () => {
      const result = await startOnline();
      const before = await prisma.reservation.findUniqueOrThrow({
        where: { id: result.booking.id },
      });
      await startGuestCheckout(checkoutService, result.booking.id, result.requestId);
      const after = await prisma.reservation.findUniqueOrThrow({
        where: { id: result.booking.id },
      });
      expect(after.holdExpiresAt).toEqual(before.holdExpiresAt);
      expect(createCheckout).toHaveBeenCalledTimes(1);
    });

    it('protects inventory while the provider result is uncertain', async () => {
      const result = await overdueOnline();
      closeSession.mockRejectedValueOnce(new ServiceUnavailableException('Synthetic timeout.'));
      expect((await deadlines.runOnce()).retrySessions).toBe(1);
      await expectProtected(result.booking.id);
      expect((await deadlines.runOnce()).expiredCount).toBe(1);
      const replacement = await createGuestBooking(service, payload());
      expect(replacement.reservationNumber).not.toBe(result.booking.reference);
    });

    it('protects inventory when the checkout session ID is unknown', async () => {
      const result = await overdueOnline();
      await prisma.payment.update({
        where: { id: result.payment.id },
        data: { providerCheckoutId: null, checkoutState: 'UNKNOWN', checkoutUrl: null },
      });
      expect((await deadlines.runOnce()).unknownSessions).toBe(1);
      await expectProtected(result.booking.id);
      expect(closeSession).not.toHaveBeenCalled();
    });

    it('protects late paid evidence from generic expiration', async () => {
      const result = await overdueOnline();
      await deliver(paidEvent(result.payment.id));
      expect((await deadlines.runOnce()).expiredCount).toBe(0);
      await expectProtected(result.booking.id);
      expect(closeSession).not.toHaveBeenCalled();
    });

    it('retains ambiguous provider evidence in the review queue', async () => {
      const result = await overdueOnline();
      closeSession.mockResolvedValueOnce('REVIEW_REQUIRED');
      await deadlines.runOnce();
      await expectProtected(result.booking.id);
      expect(await prisma.paymentEvent.count({
        where: {
          paymentId: result.payment.id,
          eventType: 'nexora.reconciliation.review',
          signatureVerified: false,
          status: 'FAILED',
        },
      })).toBe(1);
    });

    it('retains a mismatched local ledger without calling the provider', async () => {
      const result = await overdueOnline();
      await prisma.payment.update({
        where: { id: result.payment.id },
        data: { amountCentavos: result.payment.amountCentavos + 1 },
      });
      expect((await deadlines.runOnce()).reviewSessions).toBe(1);
      await expectProtected(result.booking.id);
      expect(closeSession).not.toHaveBeenCalled();
    });

    it('preserves a paid webhook arriving during provider closure', async () => {
      const result = await overdueOnline();
      closeSession.mockImplementationOnce(async () => {
        await deliver(paidEvent(result.payment.id));
        return 'EXPIRED';
      });
      expect((await deadlines.runOnce()).expiredCount).toBe(0);
      await expectProtected(result.booking.id);
      expect((await prisma.payment.findUniqueOrThrow({
        where: { id: result.payment.id },
      })).status).toBe('PAID');
    });

    it('releases assignments only after the provider confirms closure', async () => {
      const result = await overdueOnline();
      const room = await prisma.room.findFirstOrThrow();
      const assignment = await prisma.roomAssignment.create({
        data: { reservationId: result.booking.id, roomId: room.id },
      });
      closeSession.mockRejectedValueOnce(new ServiceUnavailableException('Synthetic timeout.'));
      await deadlines.runOnce();
      expect((await prisma.roomAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      })).releasedAt).toBeNull();
      const processed = await deadlines.runOnce();
      expect(processed.releasedAssignmentCount).toBe(1);
      expect((await prisma.roomAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      })).releasedAt).not.toBeNull();
    });

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
        await readGuestSummary(summaryService,
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
      const created = await createGuestBooking(service,
        payload(),
      );

      const booking =
        await prisma.reservation.findUniqueOrThrow({
          where: {
            reservationNumber:
              created.reservationNumber,
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

      expect(await prisma.reservation.findFirstOrThrow({
        where: { paymentPreference: 'PAYMONGO' },
      })).toMatchObject({ status: 'PENDING' });

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

    await createGuestBooking(service, input);

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

  it('keeps first confirmation fixed through reminder contacts and repeated confirmation', async () => {
    const booking = await request();
    await staffService.contact(actor, booking.id, 'PHONE');
    const first = await staffService.confirm(actor, booking.id, true);
    const reminder = await staffService.contact(actor, booking.id, 'EMAIL');
    const repeated = await staffService.confirm(actor, booking.id, true);
    expect(reminder.confirmedAt).toEqual(first.confirmedAt);
    expect(repeated.confirmedAt).toEqual(first.confirmedAt);
    expect(reminder.holdExpiresAt).toBeNull();
    expect(reminder.firstContactedAt).toEqual(first.firstContactedAt);
    expect(reminder.responseDeadlineAt).toEqual(first.responseDeadlineAt);
    expect(await prisma.auditLog.count({
      where: { entityId: booking.id, action: 'reservation.guest_request_confirmed' },
    })).toBe(1);
  });

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

    const guestRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'GUEST' },
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

    await createGuestBooking(service, input);

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
