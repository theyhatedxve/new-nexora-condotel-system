import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Payment, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { todayInPhilippines } from '../common/validation/philippine-date-range.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import { CHECKOUT_PAID_EVENT, object, parseWebhook, type PaidCheckout } from './paymongo-webhook.payload.js';
import { verifyPaymongoWebhook } from './paymongo-webhook.signature.js';

type Event = ReturnType<typeof parseWebhook>;
type Outcome = 'PROCESSED' | 'DUPLICATE' | 'IGNORED' | 'REVIEW_REQUIRED';

@Injectable()
export class PaymongoWebhookService {
  private readonly logger = new Logger(PaymongoWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(raw: unknown, signature: unknown) {
    const verified = verifyPaymongoWebhook(raw, signature);
    const event = parseWebhook(verified.body);

    try {
      const outcome = await withInventoryWrite(this.prisma, (tx) => this.process(tx, event, verified.stale));
      return { received: true, outcome };
    } catch {
      // A failed database transaction has not durably acknowledged the event.
      // Log only the validated event ID, never provider payloads or credentials.
      this.logger.warn(`Webhook transaction failed for ${event.id}; delivery must be retried.`);
      throw new ServiceUnavailableException('Webhook could not be saved. Retry delivery.');
    }
  }

  private async process(tx: Prisma.TransactionClient, event: Event, stale: boolean): Promise<Outcome> {
    const previous = await tx.paymentEvent.findUnique({ where: { providerEventId: event.id } });

    if (previous) {
      let proof: unknown;

      try {
        proof = JSON.parse(previous.payloadJson ?? 'null');
      } catch {
        proof = null;
      }

      if (object(proof)?.fingerprint !== event.fingerprint) {
        await tx.paymentEvent.update({
          where: { id: previous.id },
          data: { errorMessage: 'EVENT_ID_CONFLICT' },
        });

        await tx.auditLog.create({
          data: {
            action: 'payment.webhook.conflict',
            entityType: 'PaymentEvent',
            entityId: previous.id,
          },
        });

        return 'REVIEW_REQUIRED';
      }

      // A repeated delivery must not hide an existing review requirement.
      if (previous.errorMessage) return 'REVIEW_REQUIRED';

      if (previous.status === 'PROCESSED') return 'DUPLICATE';

      return previous.status === 'IGNORED' ? 'IGNORED' : 'REVIEW_REQUIRED';
    }

    if (event.type !== CHECKOUT_PAID_EVENT) {
      await this.record(tx, event, 'IGNORED', null, null);
      return 'IGNORED';
    }

    if (!event.paid) {
      await this.record(tx, event, 'FAILED', null, 'INVALID_CHECKOUT_EVENT');
      return 'REVIEW_REQUIRED';
    }

    const paid = event.paid;

    const payment = await tx.payment.findUnique({
      where: { id: paid.reference },
      include: { reservation: true },
    });

    const linked = payment?.method === 'PAYMONGO' && payment.provider === 'PAYMONGO' ? payment : null;
    const problem = stale ? 'STALE_DELIVERY' : this.mismatch(linked, paid);

    if (problem || !linked) {
      await this.record(tx, event, 'FAILED', linked?.id ?? null, problem ?? 'PAYMENT_NOT_FOUND');
      return 'REVIEW_REQUIRED';
    }

    const matched = linked;

    const collision = await tx.payment.findFirst({
      where: {
        id: { not: matched.id },
        OR: [
          { providerPaymentId: paid.providerPaymentId },
          { providerCheckoutId: paid.checkoutSessionId },
        ],
      },
      select: { id: true },
    });

    if (collision) {
      await this.record(tx, event, 'FAILED', matched.id, 'PROVIDER_ID_ALREADY_ASSOCIATED');
      return 'REVIEW_REQUIRED';
    }

    const newlyPaid = matched.status === 'PENDING';
    const now = new Date();

    if (newlyPaid) {
      const changed = await tx.payment.updateMany({
        where: { id: matched.id, status: 'PENDING' },
        data: {
          status: 'PAID',
          paidAt: now,
          providerCheckoutId: paid.checkoutSessionId,
          providerPaymentId: paid.providerPaymentId,
          checkoutUrl: null,
        },
      });

      if (changed.count !== 1) throw new Error('Concurrent payment change');
    }

    const bookingReview = newlyPaid && (
      matched.reservation.status !== 'CONFIRMED' ||
      matched.reservation.checkOutDate <= todayInPhilippines()
    );

    await this.record(tx, event, 'PROCESSED', matched.id, bookingReview ? 'BOOKING_REVIEW_REQUIRED' : null);

    if (newlyPaid) {
      await tx.auditLog.create({
        data: {
          action: bookingReview ? 'payment.paid_review_required' : 'payment.paid',
          entityType: 'Payment',
          entityId: matched.id,
          detailsJson: JSON.stringify({ eventId: event.id }),
        },
      });
    }

    return bookingReview ? 'REVIEW_REQUIRED' : newlyPaid ? 'PROCESSED' : 'DUPLICATE';
  }

  private mismatch(payment: Payment | null, paid: PaidCheckout): string | null {
    if (!payment) return 'PAYMENT_NOT_FOUND';

    if (
      !payment.checkoutRequestKeyHash ||
      !payment.checkoutRequestFingerprint ||
      !['CREATING', 'READY', 'UNKNOWN'].includes(payment.checkoutState ?? '')
    ) {
      return 'ATTEMPT_NOT_RESERVED';
    }

    if (payment.currency !== 'PHP' || paid.currency !== 'PHP' || payment.amountCentavos !== paid.amountCentavos) {
      return 'AMOUNT_CURRENCY_MISMATCH';
    }

    if (payment.providerCheckoutId && payment.providerCheckoutId !== paid.checkoutSessionId) {
      return 'SESSION_MISMATCH';
    }

    if (!payment.providerCheckoutId && payment.checkoutState === 'READY') {
      return 'SESSION_MISSING';
    }

    if (payment.providerPaymentId && payment.providerPaymentId !== paid.providerPaymentId) {
      return 'PAYMENT_ID_MISMATCH';
    }

    if (
      !['PENDING', 'PAID'].includes(payment.status) ||
      (payment.status === 'PAID' && (!payment.paidAt || !payment.providerPaymentId))
    ) {
      return 'PAYMENT_STATE_REVIEW';
    }

    return null;
  }

  private record(tx: Prisma.TransactionClient, event: Event, status: 'PROCESSED' | 'FAILED' | 'IGNORED',
    paymentId: string | null, errorMessage: string | null) {
    return tx.paymentEvent.create({
      data: {
        paymentId,
        providerEventId: event.id,
        eventType: event.type,
        providerCreatedAt: event.createdAt,
        signatureVerified: true,
        status,
        processedAt: new Date(),
        errorMessage,
        payloadJson: JSON.stringify({
          version: 1,
          fingerprint: event.fingerprint,
          livemode: false,
          ...event.paid,
        }),
      },
    });
  }
}