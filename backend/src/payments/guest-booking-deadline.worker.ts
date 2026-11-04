import {
  basename,
  isAbsolute,
} from 'node:path';

import {
  Injectable,
  Logger,
} from '@nestjs/common';

import type {
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  GuestBookingDeadlineService,
} from './guest-booking-deadline.service.js';

@Injectable()
export class GuestBookingDeadlineWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    GuestBookingDeadlineWorker.name,
  );

  private timer:
    ReturnType<typeof setTimeout> | undefined;

  private pending: Promise<void> | undefined;

  private stopped = false;

  constructor(
    private readonly deadlines:
      GuestBookingDeadlineService,
  ) {}

  onModuleInit(): void {
    if (
      process.env
        .NEXORA_BOOKING_DEADLINE_WORKER_ENABLED !==
      'true'
    ) {
      return;
    }

    const url =
      process.env.NEXORA_RUNTIME_DATABASE_URL ?? '';

    const path = url.startsWith('file:')
      ? url.slice(5)
      : '';

    if (
      !path ||
      !isAbsolute(path) ||
      basename(path).toLowerCase() === 'dev.db' ||
      !basename(path).endsWith('.test.db')
    ) {
      throw new Error(
        'The deadline worker currently requires an explicit absolute .test.db runtime target.',
      );
    }

    this.schedule(1000);
  }

  private schedule(delay: number): void {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      this.pending = this.tick();
    }, delay);

    this.timer.unref();
  }

  private async tick(): Promise<void> {
    try {
      await this.deadlines.runOnce();
    } catch {
      this.logger.warn(
        'Deadline processing could not finish. Stored work remains available for retry.',
      );
    } finally {
      this.schedule(60_000);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    await this.pending;
  }
}