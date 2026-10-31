
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import {
  PublicRoomImageController,
  RoomImagesController,
} from './room-images.controller.js';

import { ImageValidationService } from './image-validation.service.js';
import { ImageStorageService } from './image-storage.service.js';
import { RoomImagesService } from './room-images.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    RoomImagesController,
    PublicRoomImageController,
  ],
  providers: [
    ImageValidationService,
    ImageStorageService,
    RoomImagesService,
  ],
})
export class RoomImagesModule {}
