import {
  Body,
  Controller,
  ForbiddenException,
  Header,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators/public.decorator.js';
import { getAllowedOrigins } from './auth.config.js';
import {
  ChangeTemporaryPasswordDto,
  SetupStaffPasswordDto,
} from './dto/staff-password.dto.js';
import { StaffPasswordService } from './staff-password.service.js';

@Controller('auth/staff')
@Public()
@Throttle({
  default: { limit: 5, ttl: 60_000 },
})
export class StaffPasswordController {
  constructor(
    private readonly staffPasswords: StaffPasswordService,
  ) {}

  private requireOrigin(origin: string | undefined): void {
    if (!origin || !getAllowedOrigins().includes(origin)) {
      throw new ForbiddenException(
        'Request origin is not allowed.',
      );
    }
  }

  @Post('setup-password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async setupPassword(
    @Body() input: SetupStaffPasswordDto,
    @Headers('origin') origin: string | undefined,
  ) {
    this.requireOrigin(origin);

    return {
      data: await this.staffPasswords.setupPassword(input),
    };
  }

  @Post('change-temporary-password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async changeTemporaryPassword(
    @Body() input: ChangeTemporaryPasswordDto,
    @Headers('origin') origin: string | undefined,
  ) {
    this.requireOrigin(origin);

    return {
      data: await this.staffPasswords.changeTemporaryPassword(input),
    };
  }
}
