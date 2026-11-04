import {
  Controller,
  GoneException,
  Header,
  Post,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('reservations')
export class ReservationsController {
  @Public()
  @Post('pay-at-property')
  @Header('Cache-Control', 'no-store')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  payAtProperty(): never {
    throw new GoneException(
      'This booking endpoint has been retired. Return to Rooms and use the current checkout.',
    );
  }
}
