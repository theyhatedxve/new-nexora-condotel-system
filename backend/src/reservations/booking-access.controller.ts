import { All, Controller, GoneException, Header } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('reservations/access')
export class BookingAccessController {
  @Public()
  @All(['request', 'exchange', 'current', 'logout', 'checkout', 'payment-summary'])
  @Header('Cache-Control', 'no-store')
  retired(): never {
    throw new GoneException('Sign in with your guest account to access your bookings.');
  }
}
