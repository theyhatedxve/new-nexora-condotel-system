import { Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../auth/email.service.js';
import { buildConfirmationEmail, guestWebBaseUrl } from './booking-confirmation.template.js';

@Injectable()
export class BookingNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  assertConfigured(): void {
    this.email.assertBookingDeliveryConfigured();
    guestWebBaseUrl();
  }

  private async claim(id: string, baseUrl: URL) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.bookingNotification.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'SENDING', claimedAt: now, failureCode: null },
      });
      if (claimed.count !== 1) return null;

      const row = await tx.bookingNotification.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          templateKey: true,
          reservation: {
            select: {
              id: true,
              status: true,
              reservationNumber: true,
              confirmedAt: true,
              rentalType: true,
              scheduledArrivalAt: true,
              scheduledDepartureAt: true,
              checkInDate: true,
              checkOutDate: true,
              totalAmountCentavos: true,
              paymentPreference: true,
              roomType: { select: { name: true } },
              guest: {
                select: {
                  user: {
                    select: {
                      email: true,
                      status: true,
                      role: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      async function skip(failureCode: string) {
        await tx.bookingNotification.update({
          where: { id },
          data: { status: 'SKIPPED', failureCode, completedAt: new Date() },
        });
        return null;
      }

      const booking = row.reservation;
      if (row.templateKey !== 'RESERVATION_CONFIRMED' || booking.status !== 'CONFIRMED') {
        return skip('RESERVATION_CHANGED');
      }
      const recipient = booking.guest.user;
      if (
        !recipient || recipient.status !== 'ACTIVE' ||
        recipient.role.name !== 'GUEST' || !isEmail(recipient.email)
      ) {
        return skip('RECIPIENT_UNAVAILABLE');
      }

      try {
        const message = buildConfirmationEmail(booking, baseUrl);
        return {
          id: row.id,
          to: recipient.email,
          ...message,
          messageId: `<${row.id}@nexora.invalid>`,
        };
      } catch {
        return skip('INVALID_MESSAGE');
      }
    });
  }

  async runOnce(): Promise<void> {
    this.assertConfigured();
    const baseUrl = guestWebBaseUrl();
    const pending = await this.prisma.bookingNotification.findMany({
      where: { status: 'PENDING' },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 10,
    });

    for (const row of pending) {
      const message = await this.claim(row.id, baseUrl);
      if (!message) continue;
      let outcome: 'SMTP_ACCEPTED' | 'UNKNOWN';
      try {
        outcome = await this.email.sendBookingConfirmation(message);
      } catch {
        outcome = 'UNKNOWN';
      }
      const completedAt = new Date();
      await this.prisma.bookingNotification.updateMany({
        where: { id: message.id, status: 'SENDING' },
        data: outcome === 'SMTP_ACCEPTED'
          ? {
              status: 'SMTP_ACCEPTED',
              smtpAcceptedAt: completedAt,
              completedAt,
              failureCode: null,
            }
          : {
              status: 'REVIEW_REQUIRED',
              completedAt,
              failureCode: 'SMTP_OUTCOME_UNKNOWN',
            },
      });
    }
  }
}
