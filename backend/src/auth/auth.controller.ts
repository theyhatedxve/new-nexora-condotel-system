
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

import {
  getAllowedOrigins,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from './auth.config.js';

import { Public } from '../common/decorators/public.decorator.js';


import { Get, Query } from '@nestjs/common';

import { RegistrationService } from './registration.service.js';
import { EmailVerificationService } from './email-verification.service.js';

import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';


@Controller('auth')
export class AuthController {
  
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}


  private checkOrigin(origin: string | undefined): void {
    const allowedOrigins = getAllowedOrigins();

    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException(
        'Request origin is not allowed.',
      );
    }
  }

  private getRefreshCookie(request: Request): string | undefined {
    const rawToken: unknown = request.cookies?.[REFRESH_COOKIE_NAME];

    if (rawToken !== undefined && typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid cookie.');
    }

    return rawToken;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: LoginDto,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(origin);

    const result = await this.authService.login(body);

    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    return {
      data: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
        user: result.user,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(origin);

    const rawToken = this.getRefreshCookie(request);

    const result = await this.authService.refresh(rawToken);

    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    return {
      data: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async logout(
    @Req() request: Request,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    // Reject unapproved origins before touching session data.
    this.checkOrigin(origin);

    const rawToken = this.getRefreshCookie(request);

    // Missing, expired and already-revoked tokens
    // are handled without revealing session details.
    await this.authService.logout(rawToken);

    // The path must match the path used when issuing
    // the original refresh cookie.
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      REFRESH_COOKIE_OPTIONS,
    );
  }

  
  @Public()
  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(
    @Body() body: RegisterDto,
    @Headers('origin') origin: string | undefined,
  ) {
    this.checkOrigin(origin);

    return this.registrationService.register(body);
  }

  @Public()
  @Get('verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmail(
    @Query() query: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');

    await this.emailVerificationService.verifyEmail(query.token);

    return {
      message: 'Email verified successfully. You can now log in.',
    };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async resendVerification(
    @Body() body: ResendVerificationDto,
    @Headers('origin') origin: string | undefined,
  ) {
    this.checkOrigin(origin);

    return this.emailVerificationService.resendVerification(
      body.email,
    );
  }

}


