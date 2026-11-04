
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RoomBlocksController } from './room-blocks.controller.js';
import { RoomBlocksService } from './room-blocks.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RoomBlocksController],
  providers: [RoomBlocksService],
})
export class RoomBlocksModule {}
