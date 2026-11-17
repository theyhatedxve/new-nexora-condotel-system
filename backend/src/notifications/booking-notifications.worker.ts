import {
  Injectable, Logger, type OnModuleDestroy, type OnModuleInit,
} from '@nestjs/common';
import { BookingNotificationsService } from './booking-notifications.service.js';

@Injectable()
export class BookingNotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingNotificationsWorker.name);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Promise<void> | undefined;
  private stopped = false;

  constructor(private readonly notifications: BookingNotificationsService) {}

  onModuleInit(): void {
    if (process.env.NEXORA_BOOKING_EMAIL_WORKER_ENABLED !== 'true') return;
    this.notifications.assertConfigured();
    this.schedule(1000);
  }

  private schedule(delay: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.pending = this.tick();
    }, delay);
    this.timer.unref();
  }

  private async tick(): Promise<void> {
    try {
      await this.notifications.runOnce();
    } catch {
      this.logger.warn(
        'Booking email processing stopped before completion. Inspect stored delivery states.',
      );
    } finally {
      this.schedule(60000);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.pending;
  }
}
