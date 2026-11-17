import { createHash } from 'node:crypto';
import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException, ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Prisma, Reservation } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { STAFF_ROLES } from './guest-booking-staff-policy.js';
import { withInventoryWrite } from './inventory-write.js';
import { checkoutGuidance } from './stay-operations.policy.js';
import { StayOperationsService } from './stay-operations.service.js';
import { requireFullRecordedPayment } from './stay-payment-policy.js';
import { lateCheckoutCharge } from './late-checkout-charge.policy.js';
import { ReservationChargeCommandDto } from './reservation-charges.dto.js';

const managers = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const select = {
  id: true, kind: true, status: true, description: true, evidenceNotes: true,
  amountCentavos: true, createdAt: true, reviewedAt: true, appliedAt: true,
  billingBaseDepartureAt: true, fromDepartureAt: true, requestedDepartureAt: true,
  hourlyRateCentavos: true, billableHours: true,
  proposedBy: { select: { name: true } }, reviewedBy: { select: { name: true } },
  receipt: { select: {
    source: true, depositMovementId: true,
    id: true, amountCentavos: true, collectedAt: true, correctionRequired: true,
    refundedAt: true, refundReason: true, collectedBy: { select: { name: true } },
    refundedBy: { select: { name: true } },
  } },
} as const satisfies Prisma.ReservationChargeSelect;

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function command(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Invalid charge request.');
  }
  const dto = plainToInstance(ReservationChargeCommandDto, input);
  if (validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length ||
      Object.values(dto).some((value) => value === null)) {
    throw new BadRequestException('Invalid charge request.');
  }
  const fields: Record<string, string[]> = {
    PROPOSE_DAMAGE: ['description', 'evidenceNotes', 'amountCentavos'],
    PROPOSE_EXTENSION: ['requestedDepartureAt'],
    APPROVE: ['chargeId'], REJECT: ['chargeId', 'reason'],
    COLLECT: ['chargeId', 'moneyReceived'], APPLY_EXTENSION: ['chargeId'],
    REFUND_UNFULFILLED_EXTENSION: ['chargeId', 'moneyReturned', 'reason'],
  };
  const allowed = ['requestId', 'action', ...fields[dto.action]];
  if (Object.entries(dto).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (dto.action === 'PROPOSE_DAMAGE' && (!dto.description || !dto.amountCentavos)) ||
      (dto.action === 'PROPOSE_EXTENSION' && !dto.requestedDepartureAt) ||
      (!dto.action.startsWith('PROPOSE_') && !dto.chargeId) ||
      (['REJECT', 'REFUND_UNFULFILLED_EXTENSION'].includes(dto.action) && !dto.reason) ||
      (dto.action === 'COLLECT' && dto.moneyReceived !== true) ||
      (dto.action === 'REFUND_UNFULFILLED_EXTENSION' && dto.moneyReturned !== true)) {
    throw new BadRequestException('Required action details are missing or inconsistent.');
  }
  dto.requestId = dto.requestId.toLowerCase();
  if (dto.requestedDepartureAt) {
    const at = new Date(dto.requestedDepartureAt);
    if (!Number.isFinite(at.getTime())) throw new BadRequestException('Invalid departure.');
    dto.requestedDepartureAt = at.toISOString();
  }
  return dto;
}

@Injectable()
export class ReservationChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: StayOperationsService,
  ) {}

  private async context(tx: Prisma.TransactionClient, id: string, actor: AuthenticatedUser | undefined) {
    if (!actor?.id) throw new UnauthorizedException('Staff sign-in required.');
    if (!STAFF_ROLES.includes(actor.role)) throw new ForbiddenException('Staff permission required.');
    if (typeof id !== 'string' || !id.trim() || id.length > 100) throw new BadRequestException('Invalid reservation.');
    const staff = await tx.user.findUnique({
      where: { id: actor.id }, select: { status: true, role: { select: { name: true } } },
    });
    if (!staff || staff.status !== 'ACTIVE' || staff.role.name !== actor.role) {
      throw new ForbiddenException('Current staff permission required.');
    }
    const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
    if (properties.length !== 1) throw new InternalServerErrorException('Exactly one property must be configured.');
    const booking = await tx.reservation.findFirst({ where: { id, roomType: { propertyId: properties[0].id } } });
    if (!booking) throw new NotFoundException('Reservation not found.');
    return booking;
  }

  async list(id: string, page: number, actor: AuthenticatedUser | undefined) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Invalid page.');
    return this.prisma.$transaction(async (tx) => {
      await this.context(tx, id, actor);
      const where = { reservationId: id };
      const total = await tx.reservationCharge.count({ where });
      const items = await tx.reservationCharge.findMany({
        where, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 20, take: 20,
      });
      return { items, total, page, limit: 20 };
    });
  }

  private async extensionQuote(tx: Prisma.TransactionClient, booking: Reservation, to: Date, now: Date) {
    await this.operations.assertExtensionInTx(tx, booking, to, now);
    const applied = await tx.reservationCharge.findMany({
      where: { reservationId: booking.id, kind: 'LATE_CHECKOUT', appliedAt: { not: null } },
      orderBy: [{ appliedAt: 'asc' }, { id: 'asc' }],
    });
    const first = applied[0];
    const configured = first ? null : await tx.rentalRate.findUnique({
      where: { roomTypeId_rentalType: { roomTypeId: booking.roomTypeId, rentalType: 'HOURLY' } },
    });
    const rate = first?.hourlyRateCentavos ?? (configured?.isActive ? configured.rateCentavos : null);
    const base = first?.billingBaseDepartureAt ?? checkoutGuidance(booking, now).effectiveDepartureAt;
    if (!base || !rate || applied.some((row) =>
      row.billingBaseDepartureAt?.getTime() !== base.getTime() || row.hourlyRateCentavos !== rate ||
      row.billableHours === null || (row.amountCentavos > 0 && row.status !== 'APPROVED'))) {
      throw new ConflictException('Configure or review the category hourly pricing.');
    }
    const billed = applied.reduce((sum, row) => sum + row.billableHours!, 0);
    return {
      ...lateCheckoutCharge(base, to, rate, billed),
      billingBaseDepartureAt: base, fromDepartureAt: booking.inventoryEndAt!,
      requestedDepartureAt: to, hourlyRateCentavos: rate,
    };
  }

  async mutate(id: string, input: unknown, actor: AuthenticatedUser | undefined) {
    const dto = command(input);
    const normalized = Object.entries(dto).filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    const fingerprint = digest([id, normalized]);
    return withInventoryWrite(this.prisma, async (tx) => {
      const booking = await this.context(tx, id, actor);
      const staff = actor!;
      if (['APPROVE', 'REJECT', 'APPLY_EXTENSION'].includes(dto.action) && !managers.includes(staff.role)) {
        throw new ForbiddenException('Manager approval is required.');
      }
      if (dto.action === 'REFUND_UNFULFILLED_EXTENSION' && staff.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Super Admin financial correction is required.');
      }
      const key = 'charge-request-' + digest([staff.id, dto.requestId]);
      const saved = await tx.auditLog.findUnique({ where: { id: key } });
      if (saved) {
        const proof = JSON.parse(saved.detailsJson ?? '{}') as {
          fingerprint?: string; chargeId?: string; outcome?: string;
        };
        if (saved.actorUserId !== staff.id || saved.entityType !== 'Reservation' || saved.entityId !== id ||
            saved.action !== 'reservation.charge.' + dto.action.toLowerCase() || proof.fingerprint !== fingerprint ||
            typeof proof.chargeId !== 'string' || !['PROCESSED', 'REVIEW_REQUIRED'].includes(proof.outcome ?? '')) {
          throw new ConflictException('Recover the original unchanged charge request.');
        }
        const charge = await tx.reservationCharge.findFirstOrThrow({ where: { id: proof.chargeId, reservationId: id }, select });
        return { charge, outcome: proof.outcome!, replayed: true };
      }
      const now = new Date();
      let chargeId = dto.chargeId;
      let outcome = 'PROCESSED';
      const before = chargeId ? await tx.reservationCharge.findFirst({
        where: { id: chargeId, reservationId: id }, select,
      }) : null;
      if (chargeId && !before) throw new NotFoundException('Charge not found.');
      if (dto.action.startsWith('PROPOSE_')) {
        chargeId = 'charge-' + digest([staff.id, dto.requestId]);
        const damage = dto.action === 'PROPOSE_DAMAGE';
        if (damage && !['CHECKED_IN', 'CHECKED_OUT'].includes(booking.status)) {
          throw new ConflictException('Record damage against a current or completed stay.');
        }
        if (!damage && await tx.reservationCharge.findFirst({
          where: { reservationId: id, kind: 'LATE_CHECKOUT', appliedAt: null, status: { in: ['PENDING', 'APPROVED'] } },
        })) throw new ConflictException('Resolve the existing extension proposal first.');
        const quote = damage ? {} : await this.extensionQuote(tx, booking, new Date(dto.requestedDepartureAt!), now);
        await tx.reservationCharge.create({
          data: {
            id: chargeId, reservationId: id, kind: damage ? 'DAMAGE' : 'LATE_CHECKOUT',
            description: damage ? dto.description! : 'Approved-policy late checkout',
            evidenceNotes: dto.evidenceNotes || null, amountCentavos: dto.amountCentavos ?? 0,
            proposedByUserId: staff.id, ...quote,
          },
        });
      } else {
        const charge = before!;
        if (dto.action === 'APPROVE') {
          if (charge.status !== 'PENDING') throw new ConflictException('This charge was already reviewed.');
          if (charge.kind === 'LATE_CHECKOUT') {
            if (booking.inventoryEndAt?.getTime() !== charge.fromDepartureAt?.getTime()) {
              throw new ConflictException('The departure changed. Reject and replace this proposal.');
            }
            await this.operations.assertExtensionInTx(tx, booking, charge.requestedDepartureAt!, now);
          }
          await tx.reservationCharge.update({ where: { id: charge.id }, data: {
            status: 'APPROVED', reviewedByUserId: staff.id, reviewedAt: now,
          } });
        } else if (dto.action === 'REJECT') {
          if (!['PENDING', 'APPROVED'].includes(charge.status) || charge.receipt || charge.appliedAt) {
            throw new ConflictException('A collected or applied charge cannot be rejected.');
          }
          await tx.reservationCharge.update({ where: { id: charge.id }, data: {
            status: 'REJECTED', reviewedByUserId: staff.id, reviewedAt: now,
          } });
        } else if (dto.action === 'COLLECT') {
          if (charge.status !== 'APPROVED' || charge.amountCentavos <= 0 || charge.receipt) {
            throw new ConflictException('This charge does not accept a new full cash receipt.');
          }
          await tx.reservationChargeReceipt.create({ data: {
            id: 'receipt-' + digest(charge.id), chargeId: charge.id,
            amountCentavos: charge.amountCentavos, collectedByUserId: staff.id,
            correctionRequired: charge.kind === 'LATE_CHECKOUT' && (
              booking.status !== 'CHECKED_IN' || booking.inventoryEndAt?.getTime() !== charge.fromDepartureAt?.getTime()
            ),
          } });
        } else if (dto.action === 'APPLY_EXTENSION') {
          if (charge.kind !== 'LATE_CHECKOUT' || charge.status !== 'APPROVED' ||
              (charge.amountCentavos > 0 && (!charge.receipt ||
                charge.receipt.refundedAt || charge.receipt.amountCentavos !== charge.amountCentavos))) {
            throw new ConflictException('An approved, fully recorded extension charge is required.');
          }
          if (!charge.appliedAt) {
            try {
              if (booking.inventoryEndAt?.getTime() !== charge.fromDepartureAt?.getTime()) {
                throw new ConflictException('Departure changed.');
              }
              await requireFullRecordedPayment(tx, id, booking.totalAmountCentavos, now);
              await this.operations.assertExtensionInTx(tx, booking, charge.requestedDepartureAt!, now);
              await tx.reservation.update({ where: { id }, data: { inventoryEndAt: charge.requestedDepartureAt } });
              await tx.reservationCharge.update({ where: { id: charge.id }, data: { appliedAt: now } });
              if (charge.receipt) await tx.reservationChargeReceipt.update({
                where: { chargeId: charge.id }, data: { correctionRequired: false },
              });
            } catch (error) {
              if (!(error instanceof ConflictException) && !(error instanceof ServiceUnavailableException)) throw error;
              outcome = 'REVIEW_REQUIRED';
              if (charge.receipt) await tx.reservationChargeReceipt.update({
                where: { chargeId: charge.id }, data: { correctionRequired: true },
              });
            }
          }
        } else {
          if (charge.kind !== 'LATE_CHECKOUT' || charge.status !== 'APPROVED' || charge.appliedAt ||
              !charge.receipt || charge.receipt.source !== 'CASH' ||
              charge.receipt.refundedAt || !charge.receipt.correctionRequired) {
            throw new ConflictException('Only a recorded unfulfilled-extension exception can be corrected.');
          }
          await tx.reservationChargeReceipt.update({ where: { chargeId: charge.id }, data: {
            refundedAt: now, refundedByUserId: staff.id, refundReason: dto.reason,
          } });
          await tx.reservationCharge.update({ where: { id: charge.id }, data: { status: 'VOIDED' } });
        }
      }
      const charge = await tx.reservationCharge.findFirstOrThrow({ where: { id: chargeId!, reservationId: id }, select });
      await tx.auditLog.create({ data: {
        id: key, actorUserId: staff.id, action: 'reservation.charge.' + dto.action.toLowerCase(),
        entityType: 'Reservation', entityId: id,
        detailsJson: JSON.stringify({
          fingerprint, chargeId, outcome, reason: dto.reason ?? null,
          before, after: charge,
        }),
      } });
      return { charge, outcome, replayed: false };
    });
  }
}
