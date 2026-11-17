import { createHash } from 'node:crypto';
import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { STAFF_ROLES } from './guest-booking-staff-policy.js';
import { withInventoryWrite } from './inventory-write.js';
import { StayOperationsService } from './stay-operations.service.js';
import { depositBalance, type DepositTotals } from './deposit-ledger.policy.js';
import { ReservationDepositCommandDto } from './reservation-deposits.dto.js';

const managers = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function command(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Invalid deposit request.');
  }
  const dto = plainToInstance(ReservationDepositCommandDto, input);
  if (validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length ||
      Object.values(dto).some((value) => value === null)) {
    throw new BadRequestException('Invalid deposit request.');
  }
  const extra: Record<string, string[]> = {
    COLLECT: ['amountCentavos', 'moneyReceived'], DEDUCT: ['chargeId'],
    AUTHORIZE_RETURN: ['amountCentavos'],
    RETURN_CASH: ['authorizationId', 'moneyReturned'], RESTORE_EXTENSION: ['chargeId'],
  };
  const allowed = ['requestId', 'action', 'reason', ...extra[dto.action]];
  if (Object.entries(dto).some(([key, value]) => value !== undefined && !allowed.includes(key)) ||
      (['COLLECT', 'AUTHORIZE_RETURN'].includes(dto.action) && !dto.amountCentavos) ||
      (['DEDUCT', 'RESTORE_EXTENSION'].includes(dto.action) && !dto.chargeId) ||
      (dto.action === 'COLLECT' && dto.moneyReceived !== true) ||
      (dto.action === 'RETURN_CASH' && (!dto.authorizationId || dto.moneyReturned !== true))) {
    throw new BadRequestException('Required deposit details are missing.');
  }
  dto.requestId = dto.requestId.toLowerCase();
  return dto;
}

@Injectable()
export class ReservationDepositsService {
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

  private async balance(tx: Prisma.TransactionClient, reservationId: string) {
    const groups = await tx.depositMovement.groupBy({
      by: ['kind'], where: { reservationId }, _sum: { amountCentavos: true },
    });
    const totals: DepositTotals = { COLLECT: 0, DEDUCT: 0, RETURN: 0, RESTORE: 0 };
    for (const row of groups) totals[row.kind] = row._sum.amountCentavos ?? 0;
    const reserved = await tx.depositReturnAuthorization.aggregate({
      where: { reservationId, returnMovement: { is: null } },
      _sum: { amountCentavos: true },
    });
    return depositBalance(totals, reserved._sum.amountCentavos ?? 0);
  }

  async read(id: string, page: number, actor: AuthenticatedUser | undefined) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Invalid deposit page.');
    return this.prisma.$transaction(async (tx) => {
      await this.context(tx, id, actor);
      const summary = await this.balance(tx, id);
      const total = await tx.depositMovement.count({ where: { reservationId: id } });
      const items = await tx.depositMovement.findMany({
        where: { reservationId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 20, take: 20,
        select: {
          id: true, kind: true, amountCentavos: true, reason: true, createdAt: true,
          recordedBy: { select: { name: true } },
        },
      });
      const pendingReturns = await tx.depositReturnAuthorization.findMany({
        where: { reservationId: id, returnMovement: { is: null } }, take: 20,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true, amountCentavos: true, reason: true, createdAt: true,
          approvedBy: { select: { name: true } },
        },
      });
      const eligibleCharges = await tx.reservationCharge.findMany({
        where: { reservationId: id, status: 'APPROVED', amountCentavos: { gt: 0 }, receipt: { is: null } },
        take: 20, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, kind: true, description: true, amountCentavos: true },
      });
      const restorableCharges = await tx.reservationCharge.findMany({
        where: {
          reservationId: id, kind: 'LATE_CHECKOUT', status: 'APPROVED', appliedAt: null,
          receipt: { is: { source: 'DEPOSIT', correctionRequired: true, refundedAt: null } },
        },
        take: 20, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, kind: true, description: true, amountCentavos: true },
      });
      return { summary, items, pendingReturns, eligibleCharges, restorableCharges, total, page, limit: 20 };
    });
  }

  async mutate(id: string, input: unknown, actor: AuthenticatedUser | undefined) {
    const dto = command(input);
    const fingerprint = digest([id, Object.entries(dto)
      .filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))]);
    return withInventoryWrite(this.prisma, async (tx) => {
      const booking = await this.context(tx, id, actor);
      const staff = actor!;
      if (['DEDUCT', 'AUTHORIZE_RETURN'].includes(dto.action) && !managers.includes(staff.role)) {
        throw new ForbiddenException('Manager authorization required.');
      }
      if (dto.action === 'RESTORE_EXTENSION' && staff.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Super Admin correction required.');
      }
      const suffix = digest([staff.id, dto.requestId]);
      const key = 'deposit-request-' + suffix;
      const recordId = 'deposit-' + suffix;
      const previous = await tx.auditLog.findUnique({ where: { id: key } });
      if (previous) {
        const proof = JSON.parse(previous.detailsJson ?? '{}') as { fingerprint?: string; recordId?: string };
        if (previous.actorUserId !== staff.id || previous.entityType !== 'Reservation' ||
            previous.entityId !== id || proof.fingerprint !== fingerprint || typeof proof.recordId !== 'string') {
          throw new ConflictException('Recover the original unchanged deposit request.');
        }
        return { recordId: proof.recordId, summary: await this.balance(tx, id), replayed: true };
      }
      const before = await this.balance(tx, id);
      const now = new Date();
      let amount = dto.amountCentavos ?? 0;

      if (dto.action === 'COLLECT') {
        if (before.balanceCentavos + amount > 2147483647) {
          throw new ConflictException('Deposit balance exceeds the supported limit.');
        }
        await tx.depositMovement.create({ data: {
          id: recordId, reservationId: id, kind: 'COLLECT', amountCentavos: amount,
          reason: dto.reason, recordedByUserId: staff.id,
        } });
      } else if (dto.action === 'DEDUCT') {
        const charge = await tx.reservationCharge.findFirst({
          where: { id: dto.chargeId, reservationId: id }, include: { receipt: true },
        });
        if (!charge || charge.status !== 'APPROVED' || charge.amountCentavos <= 0 || charge.receipt) {
          throw new ConflictException('An approved unpaid charge is required.');
        }
        amount = charge.amountCentavos;
        if (amount > before.availableCentavos) {
          throw new ConflictException('The available deposit must cover the full charge.');
        }
        if (charge.kind === 'LATE_CHECKOUT') {
          if (booking.inventoryEndAt?.getTime() !== charge.fromDepartureAt?.getTime()) {
            throw new ConflictException('The extension proposal is stale.');
          }
          await this.operations.assertExtensionInTx(tx, booking, charge.requestedDepartureAt!, now);
        }
        await tx.depositMovement.create({ data: {
          id: recordId, reservationId: id, kind: 'DEDUCT', amountCentavos: amount,
          reason: dto.reason, recordedByUserId: staff.id,
        } });
        await tx.reservationChargeReceipt.create({ data: {
          id: 'deposit-receipt-' + suffix, chargeId: charge.id, amountCentavos: amount,
          collectedByUserId: staff.id, source: 'DEPOSIT', depositMovementId: recordId,
        } });
      } else if (dto.action === 'AUTHORIZE_RETURN') {
        if (!['CHECKED_OUT', 'CANCELLED', 'EXPIRED'].includes(booking.status)) {
          throw new ConflictException('Authorize the remaining deposit after the stay is closed.');
        }
        const unresolved = await tx.reservationCharge.findFirst({
          where: {
            reservationId: id,
            OR: [
              { status: 'PENDING' },
              { status: 'APPROVED', OR: [
                { kind: 'LATE_CHECKOUT', appliedAt: null },
                { amountCentavos: { gt: 0 }, receipt: { is: null } },
              ] },
            ],
          },
          select: { id: true },
        });
        if (unresolved || amount !== before.availableCentavos || amount <= 0) {
          throw new ConflictException('Resolve charges and reload the available deposit before approval.');
        }
        await tx.depositReturnAuthorization.create({ data: {
          id: recordId, reservationId: id, amountCentavos: amount,
          reason: dto.reason, approvedByUserId: staff.id,
        } });
      } else if (dto.action === 'RETURN_CASH') {
        const authorization = await tx.depositReturnAuthorization.findFirst({
          where: { id: dto.authorizationId, reservationId: id },
          include: { returnMovement: { select: { id: true } } },
        });
        if (!authorization || authorization.returnMovement) {
          throw new ConflictException('An unused return authorization is required.');
        }
        amount = authorization.amountCentavos;
        if (amount > before.balanceCentavos) throw new ConflictException('Deposit ledger requires review.');
        await tx.depositMovement.create({ data: {
          id: recordId, reservationId: id, kind: 'RETURN', amountCentavos: amount,
          reason: dto.reason, recordedByUserId: staff.id, returnAuthorizationId: authorization.id,
        } });
      } else {
        const charge = await tx.reservationCharge.findFirst({
          where: { id: dto.chargeId, reservationId: id }, include: { receipt: true },
        });
        const receipt = charge?.receipt;
        if (!charge || charge.kind !== 'LATE_CHECKOUT' || charge.status !== 'APPROVED' || charge.appliedAt ||
            !receipt || receipt.source !== 'DEPOSIT' || !receipt.depositMovementId ||
            receipt.refundedAt || !receipt.correctionRequired) {
          throw new ConflictException('An unfulfilled deposit-funded extension exception is required.');
        }
        const original = await tx.depositMovement.findUnique({ where: { id: receipt.depositMovementId } });
        if (!original || original.reservationId !== id || original.kind !== 'DEDUCT' ||
            original.amountCentavos !== receipt.amountCentavos) {
          throw new ConflictException('Deposit settlement requires review.');
        }
        amount = original.amountCentavos;
        await tx.depositMovement.create({ data: {
          id: recordId, reservationId: id, kind: 'RESTORE', amountCentavos: amount,
          reason: dto.reason, recordedByUserId: staff.id, reversesMovementId: original.id,
        } });
        await tx.reservationChargeReceipt.update({ where: { chargeId: charge.id }, data: {
          refundedAt: now, refundedByUserId: staff.id, refundReason: dto.reason,
        } });
        await tx.reservationCharge.update({ where: { id: charge.id }, data: { status: 'VOIDED' } });
      }
      const summary = await this.balance(tx, id);
      await tx.auditLog.create({ data: {
        id: key, actorUserId: staff.id, action: 'reservation.deposit.' + dto.action.toLowerCase(),
        entityType: 'Reservation', entityId: id,
        detailsJson: JSON.stringify({
          fingerprint, recordId, actorRole: staff.role, amountCentavos: amount,
          reason: dto.reason, chargeId: dto.chargeId ?? null, authorizationId: dto.authorizationId ?? null,
          before, after: summary,
        }),
      } });
      return { recordId, summary, replayed: false };
    });
  }
}
