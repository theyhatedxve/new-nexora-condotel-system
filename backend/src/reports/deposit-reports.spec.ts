import 'reflect-metadata';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient, type DepositMovementKind } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { DepositReportsService } from './deposit-reports.service.js';

describe('deposit movement reports', () => {
  let directory: string;
  let prisma: PrismaClient;
  let reports: DepositReportsService;
  let actor: AuthenticatedUser;
  let reservationId: string;
  let sequence = 0;
  const query = { from: '2030-01-02', to: '2030-01-02', page: 1 };

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-deposit-report-'));
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({
        url: 'file:' + join(directory, 'report.test.db').replaceAll('\\', '/'),
      }),
    });
    await prisma.$connect();
    const root = resolve(process.cwd(), 'prisma/migrations');
    const migrations = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    for (const migration of migrations) {
      const sql = readFileSync(join(root, migration.name, 'migration.sql'), 'utf8');
      for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
        await prisma.$executeRawUnsafe(statement);
      }
    }
    const role = await prisma.role.create({ data: { name: 'MANAGER' } });
    const staff = await prisma.user.create({
      data: {
        roleId: role.id, name: 'Synthetic manager', email: 'deposit-report@example.test',
        passwordHash: 'synthetic-unused-hash', status: 'ACTIVE',
      },
    });
    actor = { id: staff.id, email: staff.email, role: 'MANAGER' };
    const property = await prisma.property.create({
      data: { name: 'Synthetic', address: 'Synthetic', city: 'Synthetic', province: 'Synthetic' },
    });
    const roomType = await prisma.roomType.create({
      data: { propertyId: property.id, name: 'Synthetic', capacity: 2, baseRateCentavos: 450000 },
    });
    const guest = await prisma.guest.create({ data: { firstName: 'Synthetic', lastName: 'Guest' } });
    const booking = await prisma.reservation.create({
      data: {
        reservationNumber: 'DEPOSIT-REPORT-TEST', guestId: guest.id, roomTypeId: roomType.id,
        status: 'CHECKED_OUT', checkInDate: new Date('2030-01-01T00:00:00Z'),
        checkOutDate: new Date('2030-01-02T00:00:00Z'), guestCount: 2,
        nightlyRateCentavos: 450000, totalAmountCentavos: 450000,
      },
    });
    reservationId = booking.id;
    reports = new DepositReportsService(prisma as unknown as PrismaService);
  }, 60000);

  beforeEach(async () => {
    vi.useRealTimers();
    await prisma.depositMovement.deleteMany({ where: { kind: 'RESTORE' } });
    await prisma.depositMovement.deleteMany();
    await prisma.depositReturnAuthorization.deleteMany();
    await prisma.user.update({ where: { id: actor.id }, data: { status: 'ACTIVE' } });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2030-01-03T04:00:00Z'));
  });

  afterAll(async () => {
    vi.useRealTimers();
    try {
      if (prisma) await prisma.$disconnect();
    } finally {
      if (directory) rmSync(directory, { recursive: true, force: true });
    }
  });

  function movement(
    kind: DepositMovementKind,
    amountCentavos: number,
    createdAt = '2030-01-02T04:00:00Z',
    links: { reversesMovementId?: string; returnAuthorizationId?: string } = {},
  ) {
    sequence += 1;
    return prisma.depositMovement.create({
      data: {
        id: `deposit-report-${sequence}`, reservationId, kind, amountCentavos,
        reason: 'Synthetic report fixture', recordedByUserId: actor.id,
        createdAt: new Date(createdAt), ...links,
      },
    });
  }

  it('separates collections, deductions, restorations and actual returns', async () => {
    await movement('COLLECT', 10000);
    const deduction = await movement('DEDUCT', 2000);
    await movement('RESTORE', 2000, undefined, { reversesMovementId: deduction.id });
    const authorization = await prisma.depositReturnAuthorization.create({
      data: {
        id: 'actual-return-approval', reservationId, amountCentavos: 3000,
        reason: 'Synthetic return approval', approvedByUserId: actor.id,
      },
    });
    await movement('RETURN', 3000, undefined, { returnAuthorizationId: authorization.id });
    await prisma.depositReturnAuthorization.create({
      data: {
        id: 'pending-return-approval', reservationId, amountCentavos: 7000,
        reason: 'Synthetic pending approval', approvedByUserId: actor.id,
      },
    });
    const bookingBefore = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    const auditBefore = await prisma.auditLog.count();
    const result = await reports.read(query, actor);
    expect(result.totals).toEqual({ COLLECT: 10000, DEDUCT: 2000, RESTORE: 2000, RETURN: 3000 });
    expect(result.total).toBe(4);
    expect(result.items.every((item) => item.reservationId === reservationId)).toBe(true);
    expect(await prisma.depositMovement.count()).toBe(4);
    expect(await prisma.auditLog.count()).toBe(auditBefore);
    expect(await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } })).toEqual(bookingBefore);
  });

  it('uses Philippine-day boundaries and excludes future-dated movements', async () => {
    await movement('COLLECT', 100, '2030-01-01T15:59:59.999Z');
    await movement('COLLECT', 200, '2030-01-01T16:00:00.000Z');
    await movement('COLLECT', 300, '2030-01-02T15:59:59.999Z');
    await movement('COLLECT', 400, '2030-01-02T16:00:00.000Z');
    await movement('COLLECT', 500, '2030-01-03T05:00:00.000Z');
    expect((await reports.read(query, actor)).totals.COLLECT).toBe(500);
    const today = await reports.read({ from: '2030-01-03', to: '2030-01-03', page: 1 }, actor);
    expect(today.totals.COLLECT).toBe(400);
    expect(today.total).toBe(1);
  });

  it('keeps whole-period totals while paginating movements', async () => {
    for (let index = 0; index < 21; index += 1) {
      await movement('COLLECT', 100,
        new Date(Date.parse('2030-01-02T04:00:00Z') + index * 1000).toISOString());
    }
    const first = await reports.read(query, actor);
    const second = await reports.read({ ...query, page: 2 }, actor);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(1);
    expect(first.total).toBe(21);
    expect(second.totals).toEqual(first.totals);
    expect(second.totals.COLLECT).toBe(2100);
    expect(first.items.some((item) => item.id === second.items[0].id)).toBe(false);
    expect(first.items[0].createdAt.getTime()).toBeGreaterThan(second.items[0].createdAt.getTime());
  });

  it('rejects unauthorized and disabled identities', async () => {
    await expect(reports.read(query, undefined)).rejects.toThrow('Sign in');
    await expect(reports.read(query, { ...actor, role: 'RECEPTIONIST' })).rejects.toThrow('Report permission');
    await expect(reports.read(query, { ...actor, role: 'SUPER_ADMIN' })).rejects.toThrow('Current report permission');
    await prisma.user.update({ where: { id: actor.id }, data: { status: 'DISABLED' } });
    await expect(reports.read(query, actor)).rejects.toThrow('Current report permission');
  });

  it('rejects invalid ranges and pages and supports empty reports', async () => {
    await expect(reports.read({ ...query, from: '2030-01-03', to: '2030-01-02' }, actor)).rejects.toThrow('From date');
    await expect(reports.read({ from: '2029-12-01', to: '2030-01-02', page: 1 }, actor)).rejects.toThrow('31 calendar days');
    await expect(reports.read({ ...query, page: 0 }, actor)).rejects.toThrow('Invalid report page');
    const result = await reports.read(query, actor);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.totals).toEqual({ COLLECT: 0, DEDUCT: 0, RESTORE: 0, RETURN: 0 });
  });
});
