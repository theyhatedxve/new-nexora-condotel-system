import { roomFields, protectedStatuses } from './room-query.js';
import {
  normalizeRoomNumber,
  normalizeRoomFloor,
  handleRoomDatabaseError,
} from './room-validation.js';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { CreateRoomDto } from './dto/create-room.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';

import {
  withInventoryWrite,
  assertInventoryCommitments,
} from '../reservations/inventory-write.js';

import type { Prisma } from '../generated/prisma/client.js';

import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';

import { STAFF_ROOM_STATUSES, StaffRoomsQueryDto } from './dto/staff-rooms-query.dto.js';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPropertyId(
    db: Pick<Prisma.TransactionClient, 'property'> =
      this.prisma,
  ): Promise<string> {
    const properties = await db.property.findMany({
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

  findStaffPage(
    query: StaffRoomsQueryDto,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (
      !['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(
        actor.role,
      )
    ) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }

    const requestedPage = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (
      !Number.isSafeInteger(requestedPage) ||
      requestedPage < 1 ||
      requestedPage > 10000 ||
      ![20, 50].includes(limit)
    ) {
      throw new BadRequestException(
        'Invalid room pagination.',
      );
    }

    if (
      query.q !== undefined &&
      (
        typeof query.q !== 'string' ||
        query.q.trim().length > 30
      )
    ) {
      throw new BadRequestException(
        'Room search must contain at most 30 characters.',
      );
    }

    if (
      query.status !== undefined &&
      !STAFF_ROOM_STATUSES.includes(query.status)
    ) {
      throw new BadRequestException(
        'Invalid room status.',
      );
    }

    if (
      query.isActive !== undefined &&
      query.isActive !== 'true' &&
      query.isActive !== 'false'
    ) {
      throw new BadRequestException(
        'Invalid room active filter.',
      );
    }

    if (
      query.roomTypeId !== undefined &&
      (
        typeof query.roomTypeId !== 'string' ||
        !query.roomTypeId.trim() ||
        query.roomTypeId.trim().length > 100
      )
    ) {
      throw new BadRequestException(
        'Invalid room type filter.',
      );
    }

    const q = query.q?.trim() ?? '';
    const roomTypeId = query.roomTypeId?.trim();

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.getPropertyId(tx);

      const where: Prisma.RoomWhereInput = {
        roomType: { propertyId },

        ...(q
          ? { roomNumber: { contains: q } }
          : {}),

        ...(query.status
          ? { status: query.status }
          : {}),

        ...(query.isActive !== undefined
          ? { isActive: query.isActive === 'true' }
          : {}),

        ...(roomTypeId
          ? { roomTypeId }
          : {}),
      };

      const total = await tx.room.count({ where });
      const totalPages = Math.ceil(total / limit);

      const page = total === 0
        ? 1
        : Math.min(requestedPage, totalPages);

      const items = await tx.room.findMany({
        where,
        select: roomFields,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { roomNumber: 'asc' },
          { id: 'asc' },
        ],
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    });
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
          roomNumber: normalizeRoomNumber(
            dto.roomNumber,
          ),
          floor: normalizeRoomFloor(dto.floor),
          roomTypeId: dto.roomTypeId,
          status: 'READY',
          isActive: true,
        },
        select: roomFields,
      });
    } catch (error) {
      handleRoomDatabaseError(error);
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
        : normalizeRoomNumber(dto.roomNumber);

    const floor =
      dto.floor === undefined
        ? undefined
        : normalizeRoomFloor(dto.floor);

    try {
      return await withInventoryWrite(
        this.prisma,
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

          const result = await tx.room.update({
            where: {
              id,
            },
            data: {
              roomNumber,
              floor,
              roomTypeId: dto.roomTypeId,
              isActive: dto.isActive,
            },
            select: roomFields,
          });

          if (changingType || deactivating) {
            await assertInventoryCommitments(tx, [
              existing.roomTypeId,
              result.roomTypeId,
            ]);
          }

          return result;
        },
      );
    } catch (error) {
      handleRoomDatabaseError(error);
    }
  }
}
