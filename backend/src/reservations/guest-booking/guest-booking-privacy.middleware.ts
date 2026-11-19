import {
  Injectable,
} from '@nestjs/common';

import type {
  NestMiddleware,
} from '@nestjs/common';

import type {
  NextFunction,
  Request,
  Response,
} from 'express';

@Injectable()
export class GuestBookingPrivacyMiddleware
  implements NestMiddleware
{
  use(
    _request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    response.setHeader(
      'Cache-Control',
      'no-store',
    );

    response.vary('Cookie');
    response.vary('Origin');
    response.vary('Authorization');

    next();
  }
}
