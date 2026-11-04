
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { CreateAmenityDto } from './dto/create-amenity.dto.js';
import type { UpdateAmenityDto } from './dto/update-amenity.dto.js';

const amenityFields = {
  id: true,
  name: true,
  description: true,
} as const;

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeName(name: string): string {
    const result = name.trim().replace(/\s+/g, ' ');

    if (!result) {
      throw new BadRequestException('Amenity name is required.');
    }

    return result;
  }

  private normalizeDescription(
    description: string | null | undefined,
  ): string | null {
    return description?.trim() || null;
  }

  private async ensureUniqueName(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const amenities = await this.prisma.amenity.findMany({
      select: { id: true, name: true },
    });

    const normalized = name.toLowerCase();

    const duplicate = amenities.some(
      (amenity) =>
        amenity.id !== excludeId &&
        amenity.name.toLowerCase() === normalized,
    );

    if (duplicate) {
      throw new ConflictException(
        'An amenity with this name already exists.',
      );
    }
  }

  private async propertyId(): Promise<string> {
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

  private async requireRoomType(
    roomTypeId: string,
    publicOnly: boolean,
  ): Promise<void> {
    const propertyId = await this.propertyId();

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        id: roomTypeId,
        propertyId,
        ...(publicOnly ? { isActive: true } : {}),
      },
      select: { id: true },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found.');
    }
  }

  async findAll() {
    return this.prisma.amenity.findMany({
      select: amenityFields,
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateAmenityDto) {
    const name = this.normalizeName(dto.name);

    await this.ensureUniqueName(name);

    try {
      return await this.prisma.amenity.create({
        data: {
          name,
          description: this.normalizeDescription(dto.description),
        },
        select: amenityFields,
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateAmenityDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field must be provided.',
      );
    }

    const existing = await this.prisma.amenity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Amenity not found.');
    }

    const name =
      dto.name === undefined
        ? undefined
        : this.normalizeName(dto.name);

    if (name !== undefined) {
      await this.ensureUniqueName(name, id);
    }

    try {
      return await this.prisma.amenity.update({
        where: { id },
        data: {
          name,
          description:
            dto.description === undefined
              ? undefined
              : this.normalizeDescription(dto.description),
        },
        select: amenityFields,
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async findRoomTypeAmenities(roomTypeId: string) {
    await this.requireRoomType(roomTypeId, true);

    const links = await this.prisma.roomTypeAmenity.findMany({
      where: { roomTypeId },
      select: {
        amenity: {
          select: amenityFields,
        },
      },
    });

    return links
      .map((link) => link.amenity)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async attach(roomTypeId: string, amenityId: string) {
    await this.requireRoomType(roomTypeId, false);

    const amenity = await this.prisma.amenity.findUnique({
      where: { id: amenityId },
      select: amenityFields,
    });

    if (!amenity) {
      throw new NotFoundException('Amenity not found.');
    }

    try {
      await this.prisma.roomTypeAmenity.create({
        data: {
          roomTypeId,
          amenityId,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }

    return amenity;
  }

  async detach(
    roomTypeId: string,
    amenityId: string,
  ): Promise<void> {
    await this.requireRoomType(roomTypeId, false);

    const deleted = await this.prisma.roomTypeAmenity.deleteMany({
      where: {
        roomTypeId,
        amenityId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        'Amenity association not found.',
      );
    }
  }

  private handleDatabaseError(error: unknown): never {
    if (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Amenity or association already exists.',
      );
    }

    throw error;
  }
}
