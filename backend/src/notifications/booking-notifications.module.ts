import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailService } from '../auth/email.service.js';
import { BookingNotificationsService } from './booking-notifications.service.js';
import { BookingNotificationsWorker } from './booking-notifications.worker.js';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, BookingNotificationsService, BookingNotificationsWorker],
})
export class BookingNotificationsModule {}
