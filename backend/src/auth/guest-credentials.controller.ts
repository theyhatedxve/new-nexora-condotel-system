import { Body, Controller, Header, Headers, HttpCode, Logger, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { getAuthRealmCookie, requireAuthRealmOrigin } from './auth-realm.config.js';
import { GuestCredentialsService, GUEST_RECOVERY_MESSAGE } from './guest-credentials.service.js';
import {
  GuestCredentialTokenDto, GuestEmailChangeDto, GuestPasswordChangeDto,
  GuestPasswordResetDto, GuestRecoveryEmailDto,
} from './dto/guest-credentials.dto.js';

@Controller('auth/guest')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class GuestCredentialsController {
  private readonly logger = new Logger(GuestCredentialsController.name);
  constructor(private readonly credentials: GuestCredentialsService) {}

  private authorize(origin: string | undefined) { requireAuthRealmOrigin('guest', origin); }
  private clearCookie(response: Response) {
    const cookie = getAuthRealmCookie('guest');
    response.clearCookie(cookie.name, cookie.options);
  }

  @Roles('GUEST')
  @Post('password')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @HttpCode(200)
  async changePassword(
    @Body() input: GuestPasswordChangeDto, @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser }, @Res({ passthrough: true }) response: Response,
  ) {
    this.authorize(origin);
    const data = await this.credentials.changePassword(input, request.user);
    this.clearCookie(response);
    return { data };
  }

  @Roles('GUEST')
  @Post('email')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @HttpCode(200)
  async requestEmailChange(
    @Body() input: GuestEmailChangeDto, @Headers('origin') origin: string | undefined,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    this.authorize(origin);
    return this.credentials.requestEmailChange(input, request.user);
  }

  @Public()
  @Post('forgot-password')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(
    @Body() input: GuestRecoveryEmailDto, @Headers('origin') origin: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    this.authorize(origin);
    // Flush the same acknowledgment before any account lookup or SMTP work.
    // Keep processing in this handler without attempting a second response.
    response.status(202).json({ message: GUEST_RECOVERY_MESSAGE });
    try { await this.credentials.forgotPassword(input); }
    catch { this.logger.error('A guest password recovery request could not be processed.'); }
  }

  @Public()
  @Post('reset-password')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @HttpCode(200)
  async resetPassword(
    @Body() input: GuestPasswordResetDto, @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.authorize(origin);
    const data = await this.credentials.resetPassword(input);
    this.clearCookie(response);
    return { data };
  }

  @Public()
  @Post('confirm-email')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @HttpCode(200)
  async confirmEmail(
    @Body() input: GuestCredentialTokenDto, @Headers('origin') origin: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.authorize(origin);
    const data = await this.credentials.confirmEmailChange(input);
    this.clearCookie(response);
    return { data };
  }
}
