
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PasswordService } from './password.service.js';
import {
  ACCESS_TOKEN_SECONDS,
  getJwtSecret,
} from './auth.config.js';

import { RegistrationService } from './registration.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailService } from './email.service.js';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        algorithm: 'HS256',
        expiresIn: ACCESS_TOKEN_SECONDS,
        issuer: 'nexora-api',
        audience: 'nexora-web',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    JwtStrategy,
    RegistrationService,
    EmailVerificationService,
    EmailService, 
  ],
})
export class AuthModule {}
