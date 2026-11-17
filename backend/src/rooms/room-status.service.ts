
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';

import { PrismaService } from '../prisma/prisma.service.js';
import type { ManualRoomStatus } from './dto/update-room-status.dto.js';

import {
  withInventoryWrite,
  assertRoomInventoryCommitments,
} from '../reservations/inventory-write.js';

const transitions: Record<string, readonly string[]> = {
  READY: ['CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  CLEANING: ['READY', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  MAINTENANCE: ['CLEANING', 'READY', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['MAINTENANCE', 'CLEANING', 'READY'],
  OCCUPIED: [],
};

@Injectable()
export class RoomStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    roomId: string,
    nextStatus: ManualRoomStatus,
    actorRole: string,
    actor?: AuthenticatedUser,
    expectedStatus?: string,
  ) {
    const properties = await this.prisma.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const propertyId = properties[0].id;

    return withInventoryWrite(this.prisma, async (tx) => {
      if (actor) {
        await this.requireActor(tx, actor);
        if (actor.role !== actorRole) {
          throw new ForbiddenException('Current staff permission is required.');
        }
      }
      const room = await tx.room.findFirst({
        where: {
          id: roomId,
          roomType: { propertyId },
        },
        select: {
          id: true,
          roomNumber: true,
          status: true,
          isActive: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Room not found.');
      }

      if (expectedStatus !== undefined && room.status !== expectedStatus) {
        throw new ConflictException('The room status changed. Reload before confirming.');
      }

      if (!transitions[room.status]?.includes(nextStatus)) {
        throw new ConflictException(
          `Transition from ${room.status} to ${nextStatus} is not permitted.`,
        );
      }

      const isManager =
        actorRole === 'SUPER_ADMIN' ||
        actorRole === 'ADMIN' || actorRole === 'MANAGER';

      const isHousekeepingTransition =
        (room.status === 'READY' && nextStatus === 'CLEANING') ||
        (room.status === 'CLEANING' && nextStatus === 'READY');

      if (!isManager) {
        if (
          actorRole !== 'RECEPTIONIST' ||
          !isHousekeepingTransition
        ) {
          throw new ForbiddenException(
            'This room transition requires ADMIN or MANAGER.',
          );
        }
      }

      if (
        !room.isActive &&
        nextStatus !== 'MAINTENANCE' &&
        nextStatus !== 'OUT_OF_SERVICE'
      ) {
        throw new ConflictException(
          'Reactivate the room before making it ready.',
        );
      }

      // An active checked-in assignment must never be
      // displaced by an administrative status change.
      const checkedInAssignment =
        await tx.roomAssignment.findFirst({
          where: {
            roomId,
            releasedAt: null,
            reservation: {
              status: 'CHECKED_IN',
            },
          },
          select: { id: true },
        });

      if (checkedInAssignment) {
        throw new ConflictException(
          'A checked-in guest is assigned to this room.',
        );
      }

      const result = await tx.room.update({
        where: {
          id: roomId,
        },
        data: {
          status: nextStatus,
        },
        select: {
          id: true,
          roomNumber: true,
          status: true,
          isActive: true,
        },
      });

      if (
        nextStatus === 'MAINTENANCE' ||
        nextStatus === 'OUT_OF_SERVICE'
      ) {
        await assertRoomInventoryCommitments(tx, roomId);
      }

      if (actor) {
        await tx.auditLog.create({ data: {
          actorUserId: actor.id, action: 'room.status_changed',
          entityType: 'Room', entityId: room.id,
          createdAt: new Date(),
          detailsJson: JSON.stringify({ from: room.status, to: nextStatus, source: 'MANUAL' }),
        } });
      }
      return result;
    });
  }

  private async requireActor(tx: Prisma.TransactionClient, actor: AuthenticatedUser | undefined) {
    if (!actor?.id) throw new UnauthorizedException('Staff sign-in required.');
    const allowed = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];
    const current = await tx.user.findUnique({
      where: { id: actor.id }, select: { status: true, role: { select: { name: true } } },
    });
    if (!current || current.status !== 'ACTIVE' || current.role.name !== actor.role ||
        !allowed.includes(current.role.name)) {
      throw new ForbiddenException('Current staff permission is required.');
    }
  }

  async history(roomId: string, page: number, actor: AuthenticatedUser | undefined) {
    if (typeof roomId !== 'string' || !roomId.trim() || roomId.length > 100 ||
        !Number.isInteger(page) || page < 1 || page > 10000) {
      throw new BadRequestException('Invalid room history request.');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.requireActor(tx, actor);
      const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
      if (properties.length !== 1) throw new InternalServerErrorException('Exactly one property must be configured.');
      const room = await tx.room.findFirst({
        where: { id: roomId, roomType: { propertyId: properties[0].id } }, select: { id: true },
      });
      if (!room) throw new NotFoundException('Room not found.');
      const where = { entityType: 'Room', entityId: roomId, action: 'room.status_changed' };
      const total = await tx.auditLog.count({ where });
      const rows = await tx.auditLog.findMany({
        where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
        select: { id: true, createdAt: true, detailsJson: true, actorUser: { select: { name: true } } },
      });
      const statuses = ['READY', 'CLEANING', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'];
      const items = rows.map((row) => {
        let details: Record<string, unknown> = {};
        try {
          const value: unknown = JSON.parse(row.detailsJson ?? '{}');
          if (value && typeof value === 'object' && !Array.isArray(value)) details = value as Record<string, unknown>;
        } catch {
          // Preserve the event without inventing missing details.
        }
        return {
          id: row.id, changedAt: row.createdAt, staffName: row.actorUser?.name ?? 'Historical staff',
          from: statuses.includes(String(details.from)) ? String(details.from) : 'NOT_RECORDED',
          to: statuses.includes(String(details.to)) ? String(details.to) : 'NOT_RECORDED',
          source: ['MANUAL', 'CHECK_IN', 'CHECK_OUT'].includes(String(details.source))
            ? String(details.source) : 'NOT_RECORDED',
        };
      });
      return { items, total, page, limit: 20 };
    });
  }

}
