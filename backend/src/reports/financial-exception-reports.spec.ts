import 'reflect-metadata';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient, type Prisma, type PaymentEventStatus } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { FINANCIAL_EXCEPTION_EVENT } from '../payments/financial-exceptions.js';
import { FinancialExceptionReportsService } from './financial-exception-reports.service.js';

describe('financial-exception reports', () => {
  let directory: string;
  let prisma: PrismaClient;
  let reports: FinancialExceptionReportsService;
  let actor: AuthenticatedUser;
  let roomTypeId: string;
  let guestId: string;
  let sequence = 0;
  const query = { from: '2030-01-02', to: '2030-01-02', page: 1 };

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-exception-report-'));
    prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({
      url: 'file:' + join(directory, 'report.test.db').replaceAll('\\', '/'),
    }) });
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
    const role = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
    const staff = await prisma.user.create({ data: {
      roleId: role.id, name: 'Synthetic Super Admin', email: 'exception-report@example.test',
      passwordHash: 'synthetic-unused-hash', status: 'ACTIVE',
    } });
    actor = { id: staff.id, email: staff.email, role: 'SUPER_ADMIN' };
    const property = await prisma.property.create({ data: {
      name: 'Synthetic', address: 'Synthetic', city: 'Synthetic', province: 'Synthetic',
    } });
    const roomType = await prisma.roomType.create({ data: {
      propertyId: property.id, name: 'Synthetic', capacity: 2, baseRateCentavos: 450000,
    } });
    const guest = await prisma.guest.create({ data: { firstName: 'Synthetic', lastName: 'Guest' } });
    roomTypeId = roomType.id;
    guestId = guest.id;
    reports = new FinancialExceptionReportsService(prisma as unknown as PrismaService);
  }, 60000);

  beforeEach(async () => {
    vi.useRealTimers();
    await prisma.paymentEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.reservation.deleteMany();
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

  async function notice(
    status: PaymentEventStatus = 'FAILED',
    patch: Partial<Prisma.PaymentEventUncheckedCreateInput> = {},
  ) {
    sequence += 1;
    const booking = await prisma.reservation.create({ data: {
      reservationNumber: `EXCEPTION-REPORT-${sequence}`, guestId, roomTypeId, status: 'CONFIRMED',
      checkInDate: new Date('2030-01-01T00:00:00Z'), checkOutDate: new Date('2030-01-02T00:00:00Z'),
      guestCount: 2, nightlyRateCentavos: 450000, totalAmountCentavos: 450000,
    } });
    const payment = await prisma.payment.create({ data: {
      reservationId: booking.id, method: 'PAYMONGO', provider: 'PAYMONGO', status: 'UNPAID', amountCentavos: 450000,
    } });
    return prisma.paymentEvent.create({ data: {
      paymentId: payment.id, providerEventId: 'financial-exception:' + booking.id,
      eventType: FINANCIAL_EXCEPTION_EVENT, signatureVerified: false, status,
      errorMessage: status === 'FAILED' ? 'EXCESS_COLLECTION' : null,
      payloadJson: JSON.stringify({
        version: 1, source: 'backend_financial_exception', reservationId: booking.id, reason: 'EXCESS_COLLECTION',
      }),
      createdAt: new Date('2030-01-02T04:00:00Z'), processedAt: new Date('2030-01-03T03:00:00Z'),
      ...patch,
    } });
  }

  it('reports current states without exposing payloads or changing records', async () => {
    await notice('FAILED');
    await notice('PROCESSED');
    await notice('IGNORED', { payloadJson: 'malformed', errorMessage: null });
    const before = await prisma.paymentEvent.findMany({ orderBy: { id: 'asc' } });
    const auditBefore = await prisma.auditLog.count();
    const result = await reports.read(query, actor);
    expect(result.counts).toEqual({ OPEN: 1, RESOLVED: 1, REVIEW: 1 });
    expect(result.total).toBe(3);
    expect(result.items.find((item) => item.state === 'RESOLVED')?.reason).toBe('EXCESS_COLLECTION');
    expect(result.items.find((item) => item.state === 'REVIEW')?.reason).toBe('UNKNOWN');
    expect(result.items.every((item) =>
      !('payloadJson' in item) && !('errorMessage' in item) && !('amountCentavos' in item),
    )).toBe(true);
    expect(await prisma.paymentEvent.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    expect(await prisma.auditLog.count()).toBe(auditBefore);
  });

  it('uses first-recorded dates and excludes provider events and future notices', async () => {
    await notice('FAILED', { createdAt: new Date('2030-01-01T15:59:59.999Z') });
    await notice('FAILED', { createdAt: new Date('2030-01-01T16:00:00Z') });
    await notice('FAILED', { createdAt: new Date('2030-01-02T15:59:59.999Z') });
    await notice('FAILED', { createdAt: new Date('2030-01-02T16:00:00Z') });
    await notice('FAILED', { eventType: 'checkout_session.payment.paid', signatureVerified: true });
    expect((await reports.read(query, actor)).total).toBe(2);
    await notice('FAILED', { createdAt: new Date('2030-01-03T05:00:00Z') });
    const today = await reports.read({ from: '2030-01-03', to: '2030-01-03', page: 1 }, actor);
    expect(today.total).toBe(1);
  });

  it('keeps period counts stable across pages and current-status changes', async () => {
    let firstId = '';
    for (let index = 0; index < 21; index += 1) {
      const row = await notice('FAILED', {
        createdAt: new Date(Date.parse('2030-01-02T04:00:00Z') + index * 1000),
      });
      if (index === 0) firstId = row.id;
    }
    const first = await reports.read(query, actor);
    const second = await reports.read({ ...query, page: 2 }, actor);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(1);
    expect(first.counts.OPEN).toBe(21);
    expect(second.counts).toEqual(first.counts);
    expect(first.items.some((item) => item.id === second.items[0].id)).toBe(false);
    await prisma.paymentEvent.update({
      where: { id: firstId }, data: { status: 'PROCESSED', errorMessage: null, processedAt: new Date() },
    });
    const updated = await reports.read(query, actor);
    expect(updated.total).toBe(21);
    expect(updated.counts).toEqual({ OPEN: 20, RESOLVED: 1, REVIEW: 0 });
  });

  it('rejects non-Super-Admin, stale-role and disabled access', async () => {
    await expect(reports.read(query, undefined)).rejects.toThrow('Sign in');
    for (const role of ['GUEST', 'RECEPTIONIST', 'MANAGER', 'ADMIN']) {
      await expect(reports.read(query, { ...actor, role })).rejects.toThrow('Super Admin permission');
    }
    const manager = await prisma.role.create({ data: { name: 'MANAGER' } });
    const original = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    await prisma.user.update({ where: { id: actor.id }, data: { roleId: manager.id } });
    await expect(reports.read(query, actor)).rejects.toThrow('Current Super Admin');
    await prisma.user.update({ where: { id: actor.id }, data: { roleId: original.roleId, status: 'DISABLED' } });
    await expect(reports.read(query, actor)).rejects.toThrow('Current Super Admin');
  });

  it('validates ranges and pagination and returns explicit empty counts', async () => {
    await expect(reports.read({ ...query, page: 0 }, actor)).rejects.toThrow('Invalid report page');
    await expect(reports.read({ ...query, from: '2030-01-03' }, actor)).rejects.toThrow('From date');
    const result = await reports.read(query, actor);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.counts).toEqual({ OPEN: 0, RESOLVED: 0, REVIEW: 0 });
  });
});
