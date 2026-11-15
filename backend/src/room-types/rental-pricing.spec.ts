import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';
import { RentalPricingService } from './rental-pricing.service.js';
import { RoomTypesService } from './room-types.service.js';
import type { SaveRentalPricingDto } from './dto/rental-pricing.dto.js';

let directory = '';
let prisma: PrismaClient | undefined;
let pricing: RentalPricingService;
let categories: RoomTypesService;
let manager: AuthenticatedUser;
let receptionist: AuthenticatedUser;

function db(): PrismaClient {
  if (!prisma) throw new Error('Isolated pricing database unavailable.');
  return prisma;
}

async function staff(name: 'MANAGER' | 'RECEPTIONIST') {
  const role = await db().role.create({ data: { name } });
  const user = await db().user.create({
    data: {
      name: 'Synthetic staff',
      email: randomUUID() + '@example.invalid',
      passwordHash: 'unused-synthetic-hash',
      status: 'ACTIVE',
      roleId: role.id,
    },
  });
  return { id: user.id, email: user.email, role: name };
}

async function fixture() {
  const room = await categories.create({
    name: 'Synthetic ' + randomUUID(),
    capacity: 3,
    baseRateCentavos: 300_000,
  });
  const current = await pricing.read(room.id, manager);
  const input: SaveRentalPricingDto = {
    updatedAt: current.updatedAt,
    includedOccupancy: 2,
    rates: [
      { rentalType: 'HOURLY', rateCentavos: 45_000, extraPersonFeeCentavos: 10_000, isActive: true },
      { rentalType: 'NIGHTLY', rateCentavos: 300_000, extraPersonFeeCentavos: 50_000, isActive: true },
      { rentalType: 'WEEKLY', rateCentavos: 1_800_000, extraPersonFeeCentavos: 300_000, isActive: true },
      { rentalType: 'MONTHLY', rateCentavos: 6_750_000, extraPersonFeeCentavos: 1_125_000, isActive: true },
    ],
  };
  return { room, input };
}

describe('rental pricing persistence', () => {
  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'nexora-pricing-'));
    const path = join(directory, 'pricing.test.db');
    const sqlite = new Database(path);
    try {
      const migrations = resolve(process.cwd(), 'prisma/migrations');
      for (const entry of readdirSync(migrations, { withFileTypes: true })
        .filter((item) => item.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        sqlite.exec(readFileSync(join(migrations, entry.name, 'migration.sql'), 'utf8'));
      }
    } finally {
      sqlite.close();
    }

    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: 'file:' + path.replaceAll('\\', '/') }),
    });
    await prisma.$connect();
    await prisma.property.create({
      data: { name: 'Synthetic property', address: 'Test', city: 'Test', province: 'Test' },
    });
    pricing = new RentalPricingService(prisma as unknown as PrismaService);
    categories = new RoomTypesService(
      prisma as unknown as PrismaService, new RoomRateCapacityService(),
    );
    manager = await staff('MANAGER');
    receptionist = await staff('RECEPTIONIST');
  }, 15_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    if (directory) {
      const target = resolve(directory);
      if (
        !target.startsWith(resolve(tmpdir()) + sep) ||
        !basename(target).startsWith('nexora-pricing-')
      ) throw new Error('Refusing to remove an unexpected test directory.');
      rmSync(target, { recursive: true, force: true });
    }
  });

  it('stores four rates, audits the edit and returns a price-only quote', async () => {
    const { room, input } = await fixture();
    await pricing.save(room.id, input, manager);
    expect(await db().rentalRate.count({ where: { roomTypeId: room.id } })).toBe(4);
    const quote = await pricing.quote(room.id, {
      rentalType: 'NIGHTLY', units: 2, guests: 3,
      arrivalDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
      arrivalTime: '15:00',
    });
    expect(quote.totalAmountCentavos).toBe(700_000);
    expect(quote.quoteOnly).toBe(true);
    expect(quote.inventoryChecked).toBe(false);
    expect(await db().auditLog.count({
      where: { entityId: room.id, action: 'room_type.pricing.updated' },
    })).toBe(1);
  });

  it('denies reception edits and rejects stale saves without partial changes', async () => {
    const { room, input } = await fixture();
    await expect(pricing.save(room.id, input, receptionist))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(await db().rentalRate.count({ where: { roomTypeId: room.id } })).toBe(1);
    await pricing.save(room.id, input, manager);
    await expect(pricing.save(room.id, input, manager))
      .rejects.toBeInstanceOf(ConflictException);
    expect(await db().rentalRate.count({ where: { roomTypeId: room.id } })).toBe(4);
  });

  it('synchronizes legacy nightly edits while preserving old booking totals', async () => {
    const { room, input } = await fixture();
    await pricing.save(room.id, input, manager);
    const guest = await db().guest.create({
      data: { firstName: 'Synthetic', lastName: 'Guest' },
    });
    const booking = await db().reservation.create({
      data: {
        reservationNumber: 'PRICE-' + randomUUID(),
        guestId: guest.id, roomTypeId: room.id,
        checkInDate: new Date('2030-01-01T00:00:00Z'),
        checkOutDate: new Date('2030-01-02T00:00:00Z'),
        guestCount: 2, nightlyRateCentavos: 300_000,
        totalAmountCentavos: 300_000,
      },
    });
    await categories.update(room.id, { baseRateCentavos: 320_000 });
    const nightly = await db().rentalRate.findUniqueOrThrow({
      where: { roomTypeId_rentalType: { roomTypeId: room.id, rentalType: 'NIGHTLY' } },
    });
    expect(nightly.rateCentavos).toBe(320_000);
    expect(nightly.extraPersonFeeCentavos).toBe(50_000);
    const saved = await db().reservation.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved.nightlyRateCentavos).toBe(300_000);
    expect(saved.totalAmountCentavos).toBe(300_000);
  });

  it('keeps included occupancy within capacity after a legacy capacity edit', async () => {
    const { room, input } = await fixture();
    await pricing.save(room.id, input, manager);
    await categories.update(room.id, { capacity: 1 });
    expect((await pricing.read(room.id, manager)).includedOccupancy).toBe(1);
  });
});
