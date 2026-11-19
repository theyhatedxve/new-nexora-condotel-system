import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Public } from '../common/decorators/public.decorator.js';
import { REFRESH_TOKEN_DAYS } from './auth.config.js';
import {
  getAuthRealm,
  getAuthRealmCookie,
  requireAuthRealmOrigin,
} from './auth-realm.config.js';
import type { AuthRealm } from './auth-realm.config.js';
import { AuthService } from './auth.service.js';
import type { AuthResult } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth/:realm')
@Public()
export class AuthRealmController {
  constructor(private readonly authService: AuthService) {}

  private authorize(
    value: string,
    origin: string | undefined,
  ): AuthRealm {
    const realm = getAuthRealm(value);
    requireAuthRealmOrigin(realm, origin);
    return realm;
  }

  private readCookie(
    request: Request,
    realm: AuthRealm,
  ): string | undefined {
    const cookie = getAuthRealmCookie(realm);
    const token: unknown = request.cookies?.[cookie.name];

    if (token !== undefined && typeof token !== 'string') {
      throw new BadRequestException('Invalid cookie.');
    }

    return token;
  }

  private writeCookie(
    response: Response,
    realm: AuthRealm,
    result: AuthResult,
  ): void {
    const cookie = getAuthRealmCookie(realm);

    response.cookie(cookie.name, result.refreshToken, {
      ...cookie.options,
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Param('realm') value: string,
    @Body() body: LoginDto,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const realm = this.authorize(value, origin);
    const result = await this.authService.login(body, realm);

    this.writeCookie(response, realm, result);

    return {
      data: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
        user: result.user,
      },
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Param('realm') value: string,
    @Req() request: Request,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const realm = this.authorize(value, origin);
    const token = this.readCookie(request, realm);
    const result = await this.authService.refresh(token, realm);

    this.writeCookie(response, realm, result);

    return {
      data: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async logout(
    @Param('realm') value: string,
    @Req() request: Request,
    @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const realm = this.authorize(value, origin);
    const token = this.readCookie(request, realm);

    await this.authService.logout(token, realm);

    const cookie = getAuthRealmCookie(realm);
    response.clearCookie(cookie.name, cookie.options);
  }
}