import { createHash } from 'node:crypto';
import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, InternalServerErrorException, NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { withInventoryWrite } from './inventory-write.js';
import { CONTACT_ACTION, STAFF_ROLES } from './guest-booking-staff-policy.js';
import { ReservationContactDto } from './dto/reservation-contact.dto.js';

const FOLLOW_UP_ACTION = 'reservation.contact_follow_up_recorded';
const contactSelect = {
  id: true, actorUserId: true, detailsJson: true, createdAt: true,
  action: true, entityType: true, entityId: true,
  actorUser: { select: { name: true } },
} as const satisfies Prisma.AuditLogSelect;
type ContactRow = Prisma.AuditLogGetPayload<{ select: typeof contactSelect }>;

function project(row: ContactRow) {
  let details: Record<string, unknown> = {};
  try {
    const value: unknown = JSON.parse(row.detailsJson ?? '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      details = value as Record<string, unknown>;
    }
  } catch {
    // Old audit records can lack structured contact details.
  }
  const modern = row.action === FOLLOW_UP_ACTION;
  return {
    id: row.id, staffUserId: row.actorUserId,
    staffName: row.actorUser?.name ?? 'Historical staff record',
    contactedAt: row.createdAt,
    channel: ['PHONE', 'EMAIL'].includes(String(details.channel))
      ? String(details.channel) : 'NOT_RECORDED',
    purpose: modern ? String(details.purpose)
      : details.reminder === true ? 'REMINDER' : 'INITIAL_CONTACT',
    result: modern ? String(details.result) : 'NOT_RECORDED',
    notes: modern && typeof details.notes === 'string'
      ? details.notes.slice(0, 500) : null,
    expectedArrivalAt: modern && typeof details.expectedArrivalAt === 'string'
      ? details.expectedArrivalAt : null,
    historical: !modern,
  };
}

@Injectable()
export class ReservationContactsService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorize(
    tx: Prisma.TransactionClient, reservationId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id) throw new UnauthorizedException('Sign in with a staff account.');
    if (!STAFF_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Staff permission is required.');
    }
    if (typeof reservationId !== 'string' || !reservationId.trim() ||
        reservationId.length > 100) {
      throw new BadRequestException('Invalid reservation identifier.');
    }
    const staff = await tx.user.findUnique({
      where: { id: actor.id },
      select: { status: true, role: { select: { name: true } } },
    });
    if (!staff || staff.status !== 'ACTIVE' ||
        staff.role.name !== actor.role || !STAFF_ROLES.includes(staff.role.name)) {
      throw new ForbiddenException('Current staff permission is required.');
    }
    const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
    if (properties.length !== 1) {
      throw new InternalServerErrorException('Exactly one property must be configured.');
    }
    const booking = await tx.reservation.findFirst({
      where: { id: reservationId, roomType: { propertyId: properties[0].id } },
    });
    if (!booking) throw new NotFoundException('Reservation not found.');
    return booking;
  }

  async list(reservationId: string, page: number, actor: AuthenticatedUser | undefined) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) {
      throw new BadRequestException('Invalid contact history page.');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.authorize(tx, reservationId, actor);
      const where = {
        entityType: 'Reservation', entityId: reservationId,
        action: { in: [CONTACT_ACTION, FOLLOW_UP_ACTION] },
      };
      const total = await tx.auditLog.count({ where });
      const rows = await tx.auditLog.findMany({
        where, select: contactSelect, skip: (page - 1) * 20, take: 20,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      return { items: rows.map(project), total, page, limit: 20 };
    });
  }

  async record(
    reservationId: string, input: unknown,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Invalid contact details.');
    }
    const dto = plainToInstance(ReservationContactDto, input);
    if (!dto || validateSync(dto, {
      whitelist: true, forbidNonWhitelisted: true,
    }).length) throw new BadRequestException('Invalid contact details.');

    if (dto.expectedArrivalAt && !Number.isFinite(Date.parse(dto.expectedArrivalAt))) {
      throw new BadRequestException('Invalid arrival estimate.');
    }
    const detailsJson = JSON.stringify({
      version: 1, channel: dto.channel, purpose: dto.purpose,
      result: dto.result, notes: dto.notes || null,
      expectedArrivalAt: dto.expectedArrivalAt
        ? new Date(dto.expectedArrivalAt).toISOString() : null,
    });
    return withInventoryWrite(this.prisma, async (tx) => {
      const booking = await this.authorize(tx, reservationId, actor);
      const actorId = actor!.id;
      const id = 'contact-' + createHash('sha256')
        .update(JSON.stringify([actorId, dto.requestId.toLowerCase()])).digest('hex');
      const original = await tx.auditLog.findUnique({ where: { id }, select: contactSelect });
      if (original) {
        if (original.action !== FOLLOW_UP_ACTION || original.entityType !== 'Reservation' ||
            original.entityId !== reservationId || original.actorUserId !== actorId ||
            original.detailsJson !== detailsJson) {
          throw new ConflictException('Recover the original contact request without changing it.');
        }
        return { contact: project(original), replayed: true };
      }
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        throw new ConflictException('New arrival follow-ups require a pending or confirmed booking.');
      }
      // A factual follow-up never changes booking timing, confirmation or inventory.
      const saved = await tx.auditLog.create({
        data: {
          id, actorUserId: actorId, action: FOLLOW_UP_ACTION,
          entityType: 'Reservation', entityId: reservationId, detailsJson,
        },
        select: contactSelect,
      });
      return { contact: project(saved), replayed: false };
    });
  }
}
