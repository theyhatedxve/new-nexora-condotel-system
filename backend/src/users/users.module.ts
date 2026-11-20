import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { PasswordService } from '../auth/password.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { StaffInvitationService } from './staff-invitation.service.js';
import { StaffProfileController } from './staff-profile.controller.js';
import { StaffProfileService } from './staff-profile.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, StaffProfileController],
  providers: [
    UsersService,
    PasswordService,
    StaffInvitationService,
    StaffProfileService,
  ],
})
export class UsersModule {}
