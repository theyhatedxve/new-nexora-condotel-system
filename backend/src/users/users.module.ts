import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { PasswordService } from '../auth/password.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { StaffInvitationService } from './staff-invitation.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    PasswordService,
    StaffInvitationService,
  ],
})
export class UsersModule {}
