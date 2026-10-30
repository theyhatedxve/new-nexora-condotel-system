
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { CreateRoomDto } from './dto/create-room.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';

const roomFields = {
  id: true,
  roomNumber: true,
  floor: true,
  status: true,
  isActive: true,
  roomTypeId: true,
  roomType: {
    select: {
      id: true,
      name: true,
      capacity: true,
      isActive: true,
    },
  },
} as const;

const protectedStatuses = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
] as const;

@Injectable()
export class RoomsService {
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

  private normalizeRoomNumber(value: string): string {
    const roomNumber = value.trim();

    if (!roomNumber) {
      throw new BadRequestException(
        'Room number is required.',
      );
    }

    return roomNumber;
  }

  private normalizeFloor(
    value: string | null | undefined,
  ): string | null {
    return value?.trim() || null;
  }

  private async requireActiveRoomType(
    roomTypeId: string,
    propertyId: string,
    db: Pick<PrismaService, 'roomType'>,
  ): Promise<void> {
    const roomType = await db.roomType.findFirst({
      where: {
        id: roomTypeId,
        propertyId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!roomType) {
      throw new BadRequestException(
        'Room type does not belong to the active property.',
      );
    }
  }

  async findAll() {
    const propertyId = await this.getPropertyId();

    return this.prisma.room.findMany({
      where: {
        roomType: { propertyId },
      },
      select: roomFields,
      orderBy: { roomNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const propertyId = await this.getPropertyId();

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        roomType: { propertyId },
      },
      select: roomFields,
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    return room;
  }

  async create(dto: CreateRoomDto) {
    const propertyId = await this.getPropertyId();

    await this.requireActiveRoomType(
      dto.roomTypeId,
      propertyId,
      this.prisma,
    );

    try {
      return await this.prisma.room.create({
        data: {
          roomNumber: this.normalizeRoomNumber(
            dto.roomNumber,
          ),
          floor: this.normalizeFloor(dto.floor),
          roomTypeId: dto.roomTypeId,
          status: 'READY',
          isActive: true,
        },
        select: roomFields,
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateRoomDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided.',
      );
    }

    const propertyId = await this.getPropertyId();

    const roomNumber =
      dto.roomNumber === undefined
        ? undefined
        : this.normalizeRoomNumber(dto.roomNumber);

    const floor =
      dto.floor === undefined
        ? undefined
        : this.normalizeFloor(dto.floor);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.room.findFirst({
            where: {
              id,
              roomType: { propertyId },
            },
            select: {
              id: true,
              roomTypeId: true,
              isActive: true,
            },
          });

          if (!existing) {
            throw new NotFoundException('Room not found.');
          }

          const changingType =
            dto.roomTypeId !== undefined &&
            dto.roomTypeId !== existing.roomTypeId;

          const deactivating =
            dto.isActive === false &&
            existing.isActive;

          if (changingType) {
            await this.requireActiveRoomType(
              dto.roomTypeId!,
              propertyId,
              tx,
            );
          }

          if (changingType || deactivating) {
            const now = new Date();

            const protectedAssignment =
              await tx.roomAssignment.findFirst({
                where: {
                  roomId: id,
                  releasedAt: null,
                  reservation: {
                    status: {
                      in: [...protectedStatuses],
                    },
                    checkOutDate: { gt: now },
                  },
                },
                select: { id: true },
              });

            if (protectedAssignment) {
              throw new ConflictException(
                'Cannot change room type or deactivate a room with protected assignments.',
              );
            }
          }

          return tx.room.update({
            where: { id },
            data: {
              roomNumber,
              floor,
              roomTypeId: dto.roomTypeId,
              isActive: dto.isActive,
            },
            select: roomFields,
          });
        },
      );
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  private handleDatabaseError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Room number already exists.',
      );
    }

    throw error;
  }
}
