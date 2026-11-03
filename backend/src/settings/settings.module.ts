import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  SettingsController,
} from './settings.controller.js';

import {
  SettingsService,
} from './settings.service.js';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    SettingsController,
  ],
  providers: [
    SettingsService,
  ],
})
export class SettingsModule {}