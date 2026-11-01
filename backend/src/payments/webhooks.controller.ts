import { Controller, Header, Headers, HttpCode, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { PaymongoWebhookService } from './paymongo-webhook.service.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: PaymongoWebhookService) {}

  @Public()
  @Post('paymongo')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async paymongo(@Req() request: RawBodyRequest<Request>, @Headers('paymongo-signature') signature: unknown) {
    return { data: await this.webhooks.handle(request.rawBody, signature) };
  }
}
