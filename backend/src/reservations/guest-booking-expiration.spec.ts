import { randomUUID } from 'node:crypto';

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
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  GUEST_BOOKING_POLICY_VERSION,
} from './guest-booking-policy.js';

import {
  withInventoryWrite,
} from './inventory-write.js';

import {
  expirePendingHoldsInTx,
} from './reservation-lifecycle.js';

const NOW = new Date(
  '2026-11-10T06:00:00.000Z',
);

const PROPERTY_ID = 'expiration-property';
const ROOM_TYPE_ID = 'expiration-room-type';
const ROOM_ID = 'expiration-room';
const GUEST_ID = 'expiration-guest';

let directory = '';
let clients: PrismaService[] = [];
let prisma: PrismaService;

async function openClient() {
  const client = new PrismaService();

  clients.push(client);

  await client.$connect();

  await client.$queryRawUnsafe(
    'PRAGMA busy_timeout = 0',
  );

  return client;
}

function processDue(
  client: PrismaService = prisma,
) {
  return withInventoryWrite(
    client,
    (tx) =>
      expirePendingHoldsInTx(tx, {
        propertyId: PROPERTY_ID,
        now: new Date(NOW.getTime()),
      }),
  );
}

function makeHold(
  overrides: Partial<
    Prisma.ReservationUncheckedCreateInput
  > = {},
) {
  return prisma.reservation.create({
    data: {
      reservationNumber: `NX-${randomUUID()}`,
      guestId: GUEST_ID,
      roomTypeId: ROOM_TYPE_ID,
      checkInDate: new Date(
        '2026-11-10T00:00:00.000Z',
      ),
      checkOutDate: new Date(
        '2026-11-11T00:00:00.000Z',
      ),
      guestCount: 1,
      nightlyRateCentavos: 100000,
      totalAmountCentavos: 100000,
      status: 'PENDING',
      holdExpiresAt: new Date(NOW.getTime()),
      ...overrides,
    },
  });
}

async function makePropertyHold(
  overrides: Partial<
    Prisma.ReservationUncheckedCreateInput
  > = {},
) {
  return makeHold({
    bookingPolicyVersion:
      GUEST_BOOKING_POLICY_VERSION,
    paymentPreference: 'PAY_AT_PROPERTY',
    expectedArrivalAt: new Date(
      '2026-11-10T05:30:00.000Z',
    ),
    ...overrides,
  });
}

beforeEach(async () => {
  clients = [];

  directory = mkdtempSync(
    join(tmpdir(), 'nexora-guest-lifecycle-'),
  );

  const databasePath = join(
    directory,
    'lifecycle.test.db',
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

  await prisma.property.create({
    data: {
      id: PROPERTY_ID,
      name: 'Synthetic expiration property',
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
      name: 'Synthetic expiration room type',
      capacity: 2,
      baseRateCentavos: 100000,
      isActive: true,
    },
  });

  await prisma.room.create({
    data: {
      id: ROOM_ID,
      roomTypeId: ROOM_TYPE_ID,
      roomNumber: 'TEST-101',
      status: 'READY',
      isActive: true,
    },
  });

  await prisma.guest.create({
    data: {
      id: GUEST_ID,
      firstName: 'Synthetic',
      lastName: 'Guest',
      email: 'expiration@example.invalid',
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
  const temporaryRoot = resolve(tmpdir());

  if (
    !resolvedDirectory.startsWith(
      temporaryRoot + sep,
    ) ||
    !basename(resolvedDirectory).startsWith(
      'nexora-guest-lifecycle-',
    )
  ) {
    throw new Error(
      'Refusing unsafe fixture cleanup.',
    );
  }

  for (const name of [
    'lifecycle.test.db',
    'lifecycle.test.db-journal',
    'lifecycle.test.db-wal',
    'lifecycle.test.db-shm',
  ]) {
    rmSync(
      join(resolvedDirectory, name),
      { force: true },
    );
  }

  rmdirSync(resolvedDirectory);
  directory = '';
});

describe('guest booking deadline processing', () => {
  it('cancels a property request and releases its assignment at arrival grace', async () => {
    const hold = await makePropertyHold();

    const assignment =
      await prisma.roomAssignment.create({
        data: {
          reservationId: hold.id,
          roomId: ROOM_ID,
        },
      });

    const result = await processDue();

    expect(result).toMatchObject({
      expiredCount: 0,
      cancelledCount: 1,
      releasedAssignmentCount: 1,
      hasMore: false,
    });

    const stored =
      await prisma.reservation.findUniqueOrThrow({
        where: { id: hold.id },
      });

    expect(stored.status).toBe('CANCELLED');

    const released =
      await prisma.roomAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      });

    expect(released.releasedAt).toEqual(NOW);

    const audit =
      await prisma.auditLog.findFirstOrThrow({
        where: { entityId: hold.id },
      });

    expect(audit.action).toBe(
      'reservation.pending_confirmation_cancelled',
    );

    expect(
      JSON.parse(audit.detailsJson ?? '{}'),
    ).toMatchObject({
      reason: 'ARRIVAL_GRACE_EXPIRED',
    });
  });

  it('records the response deadline as the cancellation reason when earlier', async () => {
    const hold = await makePropertyHold({
      checkInDate: new Date(
        '2026-11-12T00:00:00.000Z',
      ),
      checkOutDate: new Date(
        '2026-11-13T00:00:00.000Z',
      ),
      expectedArrivalAt: new Date(
        '2026-11-12T06:00:00.000Z',
      ),
      firstContactedAt: new Date(
        '2026-11-09T06:00:00.000Z',
      ),
      responseDeadlineAt: new Date(
        NOW.getTime(),
      ),
    });

    await processDue();

    const audit =
      await prisma.auditLog.findFirstOrThrow({
        where: { entityId: hold.id },
      });

    expect(
      JSON.parse(audit.detailsJson ?? '{}'),
    ).toMatchObject({
      reason: 'GUEST_RESPONSE_EXPIRED',
    });
  });

  it('preserves expiration behavior for legacy and online holds', async () => {
    const legacy = await makeHold();

    const online = await makeHold({
      bookingPolicyVersion:
        GUEST_BOOKING_POLICY_VERSION,
      paymentPreference: 'PAYMONGO',
      expectedArrivalAt: new Date(
        '2026-11-10T07:00:00.000Z',
      ),
    });

    const result = await processDue();

    expect(result).toEqual({
      expiredCount: 2,
      releasedAssignmentCount: 0,
      hasMore: false,
    });

    for (const id of [legacy.id, online.id]) {
      const stored =
        await prisma.reservation.findUniqueOrThrow({
          where: { id },
        });

      expect(stored.status).toBe('EXPIRED');
    }
  });

  it('does not cancel confirmed reservations or future pending requests', async () => {
    const confirmed = await makePropertyHold({
      status: 'CONFIRMED',
    });

    const future = await makePropertyHold({
      expectedArrivalAt: new Date(
        '2026-11-10T07:00:00.000Z',
      ),
      holdExpiresAt: new Date(
        '2026-11-10T07:30:00.000Z',
      ),
    });

    expect(await processDue()).toEqual({
      expiredCount: 0,
      releasedAssignmentCount: 0,
      hasMore: false,
    });

    expect(
      (
        await prisma.reservation.findUniqueOrThrow({
          where: { id: confirmed.id },
        })
      ).status,
    ).toBe('CONFIRMED');

    expect(
      (
        await prisma.reservation.findUniqueOrThrow({
          where: { id: future.id },
        })
      ).status,
    ).toBe('PENDING');
  });

  it('does not process the same request twice', async () => {
    await makePropertyHold();

    await processDue();

    expect(await processDue()).toEqual({
      expiredCount: 0,
      releasedAssignmentCount: 0,
      hasMore: false,
    });

    expect(
      await prisma.auditLog.count(),
    ).toBe(1);
  });

  it('rolls back cancellation and assignment release if the audit write fails', async () => {
    const hold = await makePropertyHold();

    const assignment =
      await prisma.roomAssignment.create({
        data: {
          reservationId: hold.id,
          roomId: ROOM_ID,
        },
      });

    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_expiration_audit"
      BEFORE INSERT ON "AuditLog"
      BEGIN
        SELECT RAISE(ABORT, 'synthetic audit failure');
      END
    `);

    await expect(
      processDue(),
    ).rejects.toThrow();

    expect(
      (
        await prisma.reservation.findUniqueOrThrow({
          where: { id: hold.id },
        })
      ).status,
    ).toBe('PENDING');

    expect(
      (
        await prisma.roomAssignment.findUniqueOrThrow({
          where: { id: assignment.id },
        })
      ).releasedAt,
    ).toBeNull();

    expect(
      await prisma.auditLog.count(),
    ).toBe(0);
  });

  it('processes a request once across competing database clients', async () => {
    await makePropertyHold();

    const other = await openClient();

    const results = await Promise.all([
      processDue(prisma),
      processDue(other),
    ]);

    const cancelled = results.reduce(
      (total, result) =>
        total + (result.cancelledCount ?? 0),
      0,
    );

    expect(cancelled).toBe(1);

    expect(
      await prisma.auditLog.count(),
    ).toBe(1);
  });
});