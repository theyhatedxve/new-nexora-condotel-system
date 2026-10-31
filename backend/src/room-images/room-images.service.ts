
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { ImageStorageService } from './image-storage.service.js';
import { ImageValidationService } from './image-validation.service.js';
import type { UpdateRoomImageDto } from './dto/update-room-image.dto.js';

const imageFields = {
  id: true,
  roomTypeId: true,
  filePath: true,
  altText: true,
  displayOrder: true,
  isPrimary: true,
  createdAt: true,
} as const;

type ImageRecord = {
  id: string;
  roomTypeId: string;
  filePath: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: Date;
};

@Injectable()
export class RoomImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageStorageService,
    private readonly validation: ImageValidationService,
  ) {}

  private publicImage(image: ImageRecord) {
    return {
      id: image.id,
      roomTypeId: image.roomTypeId,
      altText: image.altText,
      displayOrder: image.displayOrder,
      isPrimary: image.isPrimary,
      url: `/api/room-images/${image.id}/file`,
    };
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

  private async findImage(
    roomTypeId: string,
    imageId: string,
  ): Promise<ImageRecord> {
    const image = await this.prisma.roomImage.findFirst({
      where: { id: imageId, roomTypeId },
      select: imageFields,
    });

    if (!image) {
      throw new NotFoundException('Image not found.');
    }

    return image;
  }

  async list(roomTypeId: string) {
    await this.requireRoomType(roomTypeId, true);

    const images = await this.prisma.roomImage.findMany({
      where: { roomTypeId },
      select: imageFields,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    return images.map((image) => this.publicImage(image));
  }

  async upload(
    roomTypeId: string,
    file: Express.Multer.File | undefined,
    altText?: string,
    displayOrder = 0,
  ) {
    await this.requireRoomType(roomTypeId, false);

    if (!Number.isSafeInteger(displayOrder) || displayOrder < 0) {
      throw new BadRequestException('Invalid display order.');
    }

    if (altText !== undefined && altText.length > 300) {
      throw new BadRequestException('Alt text is too long.');
    }

    const normalized = await this.validation.normalize(file);
    const filePath = await this.storage.save(normalized);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const count = await tx.roomImage.count({
          where: { roomTypeId },
        });

        // First image is primary. Later images are secondary.
        return tx.roomImage.create({
          data: {
            roomTypeId,
            filePath,
            altText: altText?.trim() || null,
            displayOrder,
            isPrimary: count === 0,
          },
          select: imageFields,
        });
      });

      return this.publicImage(created);
    } catch (error) {
      try {
        await this.storage.remove(filePath);
      } catch {
        // Storage cleanup must be investigated if this occurs.
      }

      throw error;
    }
  }

  async update(
    roomTypeId: string,
    imageId: string,
    dto: UpdateRoomImageDto,
  ) {
    await this.requireRoomType(roomTypeId, false);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one field is required.',
      );
    }

    if (dto.isPrimary === false) {
      throw new BadRequestException(
        'Choose another primary image instead.',
      );
    }

    await this.findImage(roomTypeId, imageId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.roomImage.updateMany({
          where: { roomTypeId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.roomImage.update({
        where: { id: imageId },
        data: {
          altText:
            dto.altText === undefined
              ? undefined
              : dto.altText?.trim() || null,
          displayOrder: dto.displayOrder,
          isPrimary: dto.isPrimary,
        },
        select: imageFields,
      });
    });

    return this.publicImage(updated);
  }

  async remove(
    roomTypeId: string,
    imageId: string,
  ): Promise<void> {
    await this.requireRoomType(roomTypeId, false);

    const image = await this.findImage(roomTypeId, imageId);

    // A staged file can be restored if the DB operation fails.
    const stagedKey = await this.storage.stageRemoval(image.filePath);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.roomImage.delete({
          where: { id: imageId },
        });

        if (image.isPrimary) {
          const next = await tx.roomImage.findFirst({
            where: { roomTypeId },
            orderBy: [
              { displayOrder: 'asc' },
              { createdAt: 'asc' },
              { id: 'asc' },
            ],
            select: { id: true },
          });

          if (next) {
            await tx.roomImage.update({
              where: { id: next.id },
              data: { isPrimary: true },
            });
          }
        }
      });
    } catch (error) {
      await this.storage.restoreRemoval(
        stagedKey,
        image.filePath,
      );

      throw error;
    }

    await this.storage.finalizeRemoval(stagedKey);
  }

  async readPublicImage(imageId: string): Promise<Buffer> {
    const image = await this.prisma.roomImage.findFirst({
      where: {
        id: imageId,
        roomType: {
          isActive: true,
          propertyId: await this.propertyId(),
        },
      },
      select: { filePath: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found.');
    }

    try {
      return await this.storage.read(image.filePath);
    } catch {
      throw new NotFoundException('Image not found.');
    }
  }
}
