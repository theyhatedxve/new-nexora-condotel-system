
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module.js';
import { OwnershipService } from './ownership.service.js';

@Module({
  imports: [PrismaModule],
  providers: [OwnershipService],
  exports: [OwnershipService],
})
export class OwnershipModule {}
