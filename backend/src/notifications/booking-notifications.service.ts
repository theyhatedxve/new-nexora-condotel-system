import { Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../auth/email.service.js';
import { buildConfirmationEmail, guestWebBaseUrl } from './booking-confirmation.template.js';
import { paymentEvidenceSelect } from '../payments/payment-evidence.js';
import {
  CANCELLATION_TEMPLATE,
  PAYMENT_UPDATE_PREFIX,
  REFUND_COMPLETION_PREFIX,
} from './booking-updates.queue.js';
import {
  buildCancellationEmail,
  buildPaymentUpdateEmail,
} from './booking-updates.template.js';
import { buildRefundCompletionEmail } from './refund-completion.template.js';
import {
  ARRIVAL_REMINDER_PREFIX, arrivalReminderDue, arrivalReminderKey,
} from '../reservations/booking-reminder.policy.js';
import { enqueueDueArrivalReminders } from './arrival-reminders.queue.js';
import { buildArrivalReminderEmail } from './arrival-reminder.template.js';

@Injectable()
export class BookingNotificationsService {
  private arrivalCursor: string | undefined;

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
              createdAt: true,
              firstContactedAt: true,
              expectedArrivalAt: true,
              inventoryEndAt: true,
              actualArrivalAt: true,
              actualDepartureAt: true,
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
      const confirmation = row.templateKey === 'RESERVATION_CONFIRMED';
      const cancellation = row.templateKey === CANCELLATION_TEMPLATE;
      const paymentId = row.templateKey.startsWith(PAYMENT_UPDATE_PREFIX)
        ? row.templateKey.slice(PAYMENT_UPDATE_PREFIX.length)
        : null;
      const refundId = row.templateKey.startsWith(REFUND_COMPLETION_PREFIX)
        ? row.templateKey.slice(REFUND_COMPLETION_PREFIX.length)
        : null;

      const arrivalReminder = row.templateKey.startsWith(ARRIVAL_REMINDER_PREFIX);
      if (!confirmation && !cancellation && !paymentId && !refundId && !arrivalReminder) {
        return skip('UNKNOWN_TEMPLATE');
      }
      if (
        (confirmation && booking.status !== 'CONFIRMED') ||
        (cancellation && booking.status !== 'CANCELLED')
      ) {
        return skip('RESERVATION_CHANGED');
      }
      if (arrivalReminder) {
        const arrival = arrivalReminderDue(booking, now);
        if (!arrival || arrivalReminderKey(arrival) !== row.templateKey) {
          return skip('RESERVATION_CHANGED');
        }
      }
      const recipient = booking.guest.user;
      if (
        !recipient || recipient.status !== 'ACTIVE' ||
        recipient.role.name !== 'GUEST' || !isEmail(recipient.email)
      ) {
        return skip('RECIPIENT_UNAVAILABLE');
      }

      const payments = paymentId || refundId
        ? await tx.payment.findMany({
            where: { reservationId: booking.id },
            include: {
              refunds: true,
              events: { select: paymentEvidenceSelect },
            },
          })
        : [];

      try {
        const message = confirmation
          ? buildConfirmationEmail(booking, baseUrl)
          : cancellation
            ? buildCancellationEmail(booking, baseUrl)
            : arrivalReminder
              ? buildArrivalReminderEmail(booking, row.templateKey, baseUrl, now)
              : refundId
                ? buildRefundCompletionEmail(booking, payments, refundId, baseUrl, now)
                : buildPaymentUpdateEmail(booking, payments, paymentId!, baseUrl, now);
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
    this.arrivalCursor = await enqueueDueArrivalReminders(
      this.prisma, new Date(), this.arrivalCursor,
    );
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
