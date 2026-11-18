import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { OwnershipModule } from '../common/ownership/ownership.module.js';

import { StaffGuestsController } from './staff-guests.controller.js';
import { StaffGuestsService } from './staff-guests.service.js';
import { GuestAccountsController } from './guest-accounts.controller.js';
import { GuestAccountsService } from './guest-accounts.service.js';

@Module({
  imports: [PrismaModule, OwnershipModule],
  controllers: [
    StaffGuestsController,
    GuestAccountsController,
  ],
  providers: [
    StaffGuestsService,
    GuestAccountsService,
  ],
})
export class GuestsModule {}