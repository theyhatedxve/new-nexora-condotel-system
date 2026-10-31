
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  parseBlockRange,
  parsePhilippineDate,
} from '../common/validation/philippine-date-range.js';

import type { CreateRoomBlockDto } from './dto/create-room-block.dto.js';
import type { UpdateRoomBlockDto } from './dto/update-room-block.dto.js';

import type { Prisma } from '../generated/prisma/client.js';

const protectedStatuses = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
] as const;

const blockFields = {
  id: true,
  roomId: true,
  startDate: true,
  endDate: true,
  reason: true,
  canceledAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class RoomBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPropertyId(): Promise<string> {
    const properties = await this.prisma.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    return properties[0].id;
  }

  private async requireRoom(
    roomId: string,
    propertyId: string,
    tx: Pick<PrismaService, 'room'>,
  ) {
    const room = await tx.room.findFirst({
      where: {
        id: roomId,
        roomType: { propertyId },
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    return room;
  }

  private cleanReason(reason: string): string {
    const normalized = reason.trim().replace(/\s+/g, ' ');

    if (
      normalized.length < 3 ||
      normalized.length > 500
    ) {
      throw new BadRequestException(
        'Reason must contain 3–500 characters.',
      );
    }

    return normalized;
  }

  private async checkConflicts(
    tx: Prisma.TransactionClient,
    roomId: string,
    startDate: Date,
    endDate: Date,
    excludeBlockId?: string,
  ): Promise<void> {
    const overlappingBlock = await tx.roomBlock.findFirst({
      where: {
        roomId,
        canceledAt: null,
        ...(excludeBlockId
          ? { id: { not: excludeBlockId } }
          : {}),
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: { id: true },
    });

    if (overlappingBlock) {
      throw new ConflictException(
        'An active room block overlaps these dates.',
      );
    }

    const conflictingAssignment =
      await tx.roomAssignment.findFirst({
        where: {
          roomId,
          releasedAt: null,
          reservation: {
            status: { in: [...protectedStatuses] },
            checkInDate: { lt: endDate },
            checkOutDate: { gt: startDate },
          },
        },
        select: { id: true },
      });

    if (conflictingAssignment) {
      throw new ConflictException(
        'Room block conflicts with a protected reservation.',
      );
    }
  }

  async list(roomId: string) {
    const propertyId = await this.getPropertyId();

    await this.requireRoom(roomId, propertyId, this.prisma);

    return this.prisma.roomBlock.findMany({
      where: { roomId },
      select: blockFields,
      orderBy: [
        { startDate: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async create(
    roomId: string,
    dto: CreateRoomBlockDto,
  ) {
    const propertyId = await this.getPropertyId();
    const { startDate, endDate } = parseBlockRange(
      dto.startDate,
      dto.endDate,
    );

    const reason = this.cleanReason(dto.reason);

    return this.prisma.$transaction(async (tx) => {
      const room = await this.requireRoom(
        roomId,
        propertyId,
        tx,
      );

      if (!room.isActive) {
        throw new ConflictException(
          'Cannot create a new block for an inactive room.',
        );
      }

      await this.checkConflicts(
        tx,
        roomId,
        startDate,
        endDate,
      );

      return tx.roomBlock.create({
        data: {
          roomId,
          startDate,
          endDate,
          reason,
        },
        select: blockFields,
      });
    });
  }

  async update(
    roomId: string,
    blockId: string,
    dto: UpdateRoomBlockDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field is required.',
      );
    }

    const propertyId = await this.getPropertyId();

    return this.prisma.$transaction(async (tx) => {
      await this.requireRoom(roomId, propertyId, tx);

      const existing = await tx.roomBlock.findFirst({
        where: { id: blockId, roomId },
        select: blockFields,
      });

      if (!existing) {
        throw new NotFoundException('Room block not found.');
      }

      if (existing.canceledAt !== null) {
        throw new ConflictException(
          'Canceled blocks cannot be edited.',
        );
      }

      const startDate = dto.startDate
        ? parsePhilippineDate(dto.startDate)
        : existing.startDate;

      const endDate = dto.endDate
        ? parsePhilippineDate(dto.endDate)
        : existing.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException(
          'Block end date must be after start date.',
        );
      }

      await this.checkConflicts(
        tx,
        roomId,
        startDate,
        endDate,
        blockId,
      );

      return tx.roomBlock.update({
        where: { id: blockId },
        data: {
          startDate,
          endDate,
          reason:
            dto.reason === undefined
              ? undefined
              : this.cleanReason(dto.reason),
        },
        select: blockFields,
      });
    });
  }

  async cancel(
    roomId: string,
    blockId: string,
  ) {
    const propertyId = await this.getPropertyId();

    return this.prisma.$transaction(async (tx) => {
      await this.requireRoom(roomId, propertyId, tx);

      const block = await tx.roomBlock.findFirst({
        where: { id: blockId, roomId },
        select: {
          id: true,
          canceledAt: true,
        },
      });

      if (!block) {
        throw new NotFoundException('Room block not found.');
      }

      if (block.canceledAt !== null) {
        throw new ConflictException(
          'Room block is already canceled.',
        );
      }

      return tx.roomBlock.update({
        where: { id: blockId },
        data: {
          canceledAt: new Date(),
        },
        select: blockFields,
      });
    });
  }
}
