
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';

import { RoomTypesModule } from './room-types/room-types.module.js';

import { RoomsModule } from './rooms/rooms.module.js';

import { AmenitiesModule } from './amenities/amenities.module.js';

import { RoomImagesModule } from './room-images/room-images.module.js';
@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([
    {
      ttl: 60_000,
      limit: 60,
    },
  ]),
  AuthModule, RoomTypesModule, RoomsModule, AmenitiesModule, RoomImagesModule,],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },

  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },],

})


export class AppModule {}