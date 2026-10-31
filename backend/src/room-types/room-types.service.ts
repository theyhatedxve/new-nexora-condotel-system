
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { CreateRoomTypeDto } from './dto/create-room-type.dto.js';
import type { UpdateRoomTypeDto } from './dto/update-room-type.dto.js';

import { RoomRateCapacityService } from '../common/validation/room-rate-capacity.service.js';

const publicFields = {
  id: true,
  name: true,
  description: true,
  capacity: true,
  baseRateCentavos: true,
} as const;

const staffFields = {
  ...publicFields,
  isActive: true,
  propertyId: true,
} as const;

@Injectable()
export class RoomTypesService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly rateCapacity: RoomRateCapacityService,
) {}

  // Only the approved single property is supported.
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

  // Public results never include inactive room types.
  async findAll() {
    const propertyId = await this.getPropertyId();

    return this.prisma.roomType.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      select: publicFields,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const propertyId = await this.getPropertyId();

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        id,
        propertyId,
        isActive: true,
      },
      select: publicFields,
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found.');
    }

    return roomType;
  }

  async create(dto: CreateRoomTypeDto) {
    const propertyId = await this.getPropertyId();
    const name = dto.name.trim();

    this.rateCapacity.validateRoomType({
    baseRateCentavos: dto.baseRateCentavos,
    capacity: dto.capacity,
    });

    if (!name) {
      throw new BadRequestException(
        'Room type name is required.',
      );
    }

    try {
      return await this.prisma.roomType.create({
        data: {
          propertyId,
          name,
          description: dto.description?.trim() || null,
          capacity: dto.capacity,
          baseRateCentavos: dto.baseRateCentavos,
          isActive: true,
        },
        select: staffFields,
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateRoomTypeDto) {
    const propertyId = await this.getPropertyId();

    if (dto.baseRateCentavos !== undefined) {
    this.rateCapacity.validateBaseRate(
        dto.baseRateCentavos,
    );
    }

    if (dto.capacity !== undefined) {
    this.rateCapacity.validateCapacity(
        dto.capacity,
    );
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided.',
      );
    }

    const name =
      dto.name === undefined
        ? undefined
        : dto.name.trim();

    if (name === '') {
      throw new BadRequestException(
        'Room type name is required.',
      );
    }

    try {
      // A transaction keeps the existing-record lookup,
      // booking checks, and update together.
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.roomType.findFirst({
          where: { id, propertyId },
          select: {
            id: true,
            capacity: true,
            isActive: true,
          },
        });

        if (!existing) {
          throw new NotFoundException(
            'Room type not found.',
          );
        }

        const isReducingCapacity =
          dto.capacity !== undefined &&
          dto.capacity < existing.capacity;

        const isDeactivating =
          dto.isActive === false && existing.isActive;

        if (isReducingCapacity || isDeactivating) {
          const protectedReservations =
            await tx.reservation.findMany({
              where: {
                roomTypeId: id,
                status: {
                  in: [
                    'PENDING',
                    'CONFIRMED',
                    'CHECKED_IN',
                  ],
                },
                checkOutDate: {
                  gt: new Date(),
                },
              },
              select: { guestCount: true },
            });

          if (
            isDeactivating &&
            protectedReservations.length > 0
          ) {
            throw new ConflictException(
              'Cannot deactivate a room type with active or upcoming reservations.',
            );
          }

          if (
            isReducingCapacity &&
            protectedReservations.some(
              (reservation) =>
                reservation.guestCount > dto.capacity!,
            )
          ) {
            throw new ConflictException(
              'New capacity is below an existing reservation guest count.',
            );
          }
        }

        return tx.roomType.update({
          where: { id },
          data: {
            name,
            description:
              dto.description === undefined
                ? undefined
                : dto.description?.trim() || null,
            capacity: dto.capacity,
            baseRateCentavos: dto.baseRateCentavos,
            isActive: dto.isActive,
          },
          select: staffFields,
        });
      });
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
        'A room type with this name already exists.',
      );
    }

    throw error;
  }
}
