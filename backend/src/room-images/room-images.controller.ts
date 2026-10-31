
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

import { Public } from '../common/decorators/public.decorator.js';
import {
  Roles,
  USER_ROLES,
} from '../common/decorators/roles.decorator.js';

import { UpdateRoomImageDto } from './dto/update-room-image.dto.js';
import { MAX_IMAGE_BYTES } from './image-validation.service.js';
import { RoomImagesService } from './room-images.service.js';

@Controller('room-types/:id/images')
export class RoomImagesController {
  constructor(private readonly images: RoomImagesService) {}

  @Public()
  @Get()
  async list(@Param('id') roomTypeId: string) {
    return {
      data: await this.images.list(roomTypeId),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
        fields: 2,
      },
    }),
  )
  async upload(
    @Param('id') roomTypeId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, string>,
  ) {
    const allowed = ['altText', 'displayOrder'];

    if (Object.keys(body).some((key) => !allowed.includes(key))) {
      throw new BadRequestException('Unexpected upload field.');
    }

    let displayOrder = 0;

    if (body.displayOrder !== undefined) {
      if (!/^(0|[1-9]\d*)$/.test(body.displayOrder)) {
        throw new BadRequestException('Invalid display order.');
      }

      displayOrder = Number(body.displayOrder);

      if (
        !Number.isSafeInteger(displayOrder) ||
        displayOrder > 2147483647
      ) {
        throw new BadRequestException('Invalid display order.');
      }
    }

    if (
      body.altText !== undefined &&
      (typeof body.altText !== 'string' || body.altText.length > 300)
    ) {
      throw new BadRequestException('Invalid alt text.');
    }

    return {
      data: await this.images.upload(
        roomTypeId,
        file,
        body.altText,
        displayOrder,
      ),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Patch(':imageId')
  async update(
    @Param('id') roomTypeId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateRoomImageDto,
  ) {
    return {
      data: await this.images.update(roomTypeId, imageId, dto),
    };
  }

  @Roles(USER_ROLES.ADMIN, USER_ROLES.MANAGER)
  @Delete(':imageId')
  @HttpCode(204)
  async remove(
    @Param('id') roomTypeId: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.images.remove(roomTypeId, imageId);
  }
}

@Controller('room-images')
export class PublicRoomImageController {
  constructor(private readonly images: RoomImagesService) {}

  @Public()
  @Get(':imageId/file')
  async file(
    @Param('imageId') imageId: string,
    @Res() response: Response,
  ): Promise<void> {
    const image = await this.images.readPublicImage(imageId);

    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.setHeader('Content-Disposition', 'inline');

    response.status(200).end(image);
  }
}
