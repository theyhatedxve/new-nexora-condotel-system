import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Payment, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { todayInPhilippines } from '../common/validation/philippine-date-range.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import {
  CHECKOUT_PAID_EVENT,
  REFUND_EVENTS,
  PAYMENT_FAILED_EVENT,
  object,
  parseWebhook,
  type PaidCheckout,
} from './paymongo-webhook.payload.js';
import { settlePaymongoRefund } from './refund-settlement.js';
import { hasVerifiedPaymongoEvidence, paymentEvidenceSelect } from './payment-evidence.js';
import { verifyPaymongoWebhook } from './paymongo-webhook.signature.js';

import {
  confirmPendingOnlineBookingInTx,
  isPendingOnlineBooking,
} from './pending-online-booking.js';

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
      const outcome = await withInventoryWrite(this.prisma, (tx) =>
        this.process(tx, event, verified.stale),
      );
      return { received: true, outcome };
    } catch {
      // A failed database transaction has not durably acknowledged the event.
      // Log only the validated event ID, never provider payloads or credentials.
      this.logger.warn(
        `Webhook transaction failed for ${event.id}; delivery must be retried.`,
      );
      throw new ServiceUnavailableException(
        'Webhook could not be saved. Retry delivery.',
      );
    }
  }

  private async process(
    tx: Prisma.TransactionClient,
    event: Event,
    stale: boolean,
  ): Promise<Outcome> {
    const previous = await tx.paymentEvent.findUnique({
      where: { providerEventId: event.id },
    });

    if (previous) {
      let proof: unknown;

      try {
        proof = JSON.parse(previous.payloadJson ?? 'null');
      } catch {
        proof = null;
      }

      const legacy =
        previous.status === 'IGNORED' &&
        !previous.errorMessage &&
        (REFUND_EVENTS.includes(event.type) ||
          event.type === PAYMENT_FAILED_EVENT) &&
        object(proof)?.fingerprint === event.legacyFingerprint;

      if (legacy) {
        await tx.auditLog.create({
          data: {
            action: 'payment.webhook.legacy_reprocessed',
            entityType: 'PaymentEvent',
            entityId: previous.id,
            detailsJson: JSON.stringify({
              version: 1,
              originalFingerprint: event.legacyFingerprint,
            }),
          },
        });
      } else if (object(proof)?.fingerprint !== event.fingerprint) {
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
      if (!legacy && previous.errorMessage) return 'REVIEW_REQUIRED';

      if (!legacy && previous.status === 'PROCESSED') return 'DUPLICATE';

      if (!legacy)
        return previous.status === 'IGNORED' ? 'IGNORED' : 'REVIEW_REQUIRED';
    }

    if (REFUND_EVENTS.includes(event.type))
      return this.refundEvent(tx, event, stale);

    if (event.type === PAYMENT_FAILED_EVENT) {
      if (!event.failed && !event.relatedPaymentId) {
        await this.record(tx, event, 'IGNORED', null, null);
        return 'IGNORED';
      }

      const payment = event.relatedPaymentId
        ? await tx.payment.findUnique({
            where: { providerPaymentId: event.relatedPaymentId },
            select: { id: true, provider: true, method: true },
          })
        : null;

      await this.record(
        tx,
        event,
        'FAILED',
        payment?.provider === 'PAYMONGO' && payment.method === 'PAYMONGO'
          ? payment.id
          : null,
        stale
          ? 'STALE_DELIVERY'
          : event.failed
            ? 'PAYMENT_FAILED_REVIEW'
            : 'INVALID_PAYMENT_FAILED_EVENT',
      );

      return 'REVIEW_REQUIRED';
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
      include: { reservation: true, events: { select: paymentEvidenceSelect } },
    });

    const linked =
      payment?.method === 'PAYMONGO' && payment.provider === 'PAYMONGO'
        ? payment
        : null;

    const problem = stale
      ? 'STALE_DELIVERY'
      : (this.mismatch(linked, paid) ??
        (linked &&
        ['PARTIALLY_REFUNDED', 'REFUNDED'].includes(linked.status) &&
        !hasVerifiedPaymongoEvidence(linked)
          ? 'PAYMENT_STATE_REVIEW'
          : null));

    if (problem || !linked) {
      await this.record(
        tx,
        event,
        'FAILED',
        linked?.id ?? null,
        problem ?? 'PAYMENT_NOT_FOUND',
      );
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
      await this.record(
        tx,
        event,
        'FAILED',
        matched.id,
        'PROVIDER_ID_ALREADY_ASSOCIATED',
      );
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

        let bookingReview =
      newlyPaid &&
      (
        matched.reservation.status !== 'CONFIRMED' ||
        matched.reservation.checkOutDate <=
          todayInPhilippines()
      );

    if (
      newlyPaid &&
      isPendingOnlineBooking(
        matched.reservation,
      )
    ) {
      const confirmed =
        await confirmPendingOnlineBookingInTx(
          tx,
          matched.id,
          event.id,
          event.createdAt,
        );

      bookingReview = !confirmed;
    }

    await this.record(
      tx,
      event,
      'PROCESSED',
      matched.id,
      bookingReview ? 'BOOKING_REVIEW_REQUIRED' : null,
    );

    if (newlyPaid) {
      await tx.auditLog.create({
        data: {
          action: bookingReview
            ? 'payment.paid_review_required'
            : 'payment.paid',
          entityType: 'Payment',
          entityId: matched.id,
          detailsJson: JSON.stringify({ eventId: event.id }),
        },
      });
    }

    return bookingReview
      ? 'REVIEW_REQUIRED'
      : newlyPaid
        ? 'PROCESSED'
        : 'DUPLICATE';
  }

  private async refundEvent(
    tx: Prisma.TransactionClient,
    event: Event,
    stale: boolean,
  ): Promise<Outcome> {
    const payment = event.relatedPaymentId
      ? await tx.payment.findUnique({
          where: { providerPaymentId: event.relatedPaymentId },
          select: { id: true, method: true, provider: true },
        })
      : null;

    const linked =
      payment?.method === 'PAYMONGO' && payment.provider === 'PAYMONGO'
        ? payment
        : null;

    let problem = stale
      ? 'STALE_DELIVERY'
      : !event.refunds
        ? 'INVALID_REFUND_EVENT'
        : !linked
          ? 'PAYMENT_NOT_FOUND'
          : null;

    let changed = false;

    if (!problem && linked && event.refunds) {
      for (const fact of event.refunds) {
        const matches = await tx.refund.findMany({
          where: {
            OR: [
              { providerRefundId: fact.id },
              ...(fact.localRefundId ? [{ id: fact.localRefundId }] : []),
            ],
          },
          take: 2,
        });

        const refund = matches[0];

        if (
          matches.length !== 1 ||
          refund.paymentId !== linked.id ||
          refund.reason !== fact.reason ||
          (fact.localRefundId && fact.localRefundId !== refund.id)
        ) {
          problem = 'REFUND_UNMATCHED';
          continue;
        }

        const outcome = await settlePaymongoRefund(tx, refund.id, {
          ...fact,
          localRefundId: refund.id,
        });

        if (outcome === 'REVIEW_REQUIRED') problem = 'REFUND_STATE_CONFLICT';
        if (outcome === 'PROCESSED') changed = true;
      }
    }

    await this.record(
      tx,
      event,
      problem ? 'FAILED' : 'PROCESSED',
      linked?.id ?? null,
      problem,
    );

    return problem ? 'REVIEW_REQUIRED' : changed ? 'PROCESSED' : 'DUPLICATE';
  }

  async reconcileInTransaction(
    tx: Prisma.TransactionClient,
    paymentId: string,
    eventId: string,
    remote: {
      id: string;
      amountCentavos: number;
      currency: 'PHP';
      status: 'paid';
      refunds: number;
    },
    acknowledgeLateCapture: boolean,
    actorId: string,
  ): Promise<Outcome> {
    const saved = await tx.paymentEvent.findUnique({
      where: { providerEventId: eventId },
    });

    let proof: Record<string, unknown> | null = null;

    try {
      proof = object(JSON.parse(saved?.payloadJson ?? 'null'));
    } catch {
      proof = null;
    }

    if (
      !saved?.signatureVerified ||
      saved.eventType !== CHECKOUT_PAID_EVENT ||
      saved.paymentId !== paymentId ||
      !saved.providerCreatedAt ||
      proof?.version !== 1 ||
      proof.livemode !== false ||
      !['STALE_DELIVERY', 'BOOKING_REVIEW_REQUIRED'].includes(
        saved.errorMessage ?? '',
      )
    )
      return 'REVIEW_REQUIRED';

    const parsed = parseWebhook({
      data: {
        id: saved.providerEventId,
        type: 'event',
        attributes: {
          type: CHECKOUT_PAID_EVENT,
          livemode: false,
          created_at: saved.providerCreatedAt.getTime() / 1000,
          data: {
            id: proof.checkoutSessionId,
            type: 'checkout_session',
            attributes: {
              reference_number: proof.reference,
              payments: [
                {
                  id: proof.providerPaymentId,
                  type: 'payment',
                  attributes: {
                    status: 'paid',
                    amount: proof.amountCentavos,
                    currency: proof.currency,
                  },
                },
              ],
            },
          },
        },
      },
    });

    if (
      !parsed.paid ||
      proof.fingerprint !== parsed.fingerprint ||
      remote.id !== parsed.paid.providerPaymentId ||
      remote.amountCentavos !== parsed.paid.amountCentavos ||
      remote.currency !== parsed.paid.currency ||
      remote.status !== 'paid' ||
      remote.refunds !== 0
    )
      return 'REVIEW_REQUIRED';

    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { reservation: true },
    });

    if (
      payment?.method !== 'PAYMONGO' ||
      payment.provider !== 'PAYMONGO' ||
      this.mismatch(payment, parsed.paid)
    )
      return 'REVIEW_REQUIRED';

    if (
      await tx.payment.findFirst({
        where: {
          id: { not: paymentId },
          OR: [
            { providerPaymentId: parsed.paid.providerPaymentId },
            { providerCheckoutId: parsed.paid.checkoutSessionId },
          ],
        },
        select: { id: true },
      })
    )
      return 'REVIEW_REQUIRED';

    const newlyPaid = payment.status === 'PENDING';

    const late =
      saved.errorMessage === 'BOOKING_REVIEW_REQUIRED' ||
      (newlyPaid &&
        (payment.reservation.status !== 'CONFIRMED' ||
          payment.reservation.checkOutDate <= todayInPhilippines()));

    const reason =
      late && !acknowledgeLateCapture ? 'BOOKING_REVIEW_REQUIRED' : null;

    if (newlyPaid) {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          providerCheckoutId: parsed.paid.checkoutSessionId,
          providerPaymentId: parsed.paid.providerPaymentId,
          checkoutUrl: null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: reason ? 'payment.paid_review_required' : 'payment.paid',
          entityType: 'Payment',
          entityId: paymentId,
          detailsJson: JSON.stringify({ eventId }),
        },
      });
    }

    await tx.paymentEvent.update({
      where: { id: saved.id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        errorMessage: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'payment.review.reconciled',
        entityType: 'PaymentEvent',
        entityId: saved.id,
        detailsJson: JSON.stringify({
          version: 1,
          previousReason: saved.errorMessage,
          remainingReason: reason,
          originalFingerprint: parsed.fingerprint,
          acknowledgeLateCapture,
        }),
      },
    });

    return reason ? 'REVIEW_REQUIRED' : 'PROCESSED';
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

    if (
      payment.currency !== 'PHP' ||
      paid.currency !== 'PHP' ||
      payment.amountCentavos !== paid.amountCentavos
    ) {
      return 'AMOUNT_CURRENCY_MISMATCH';
    }

    if (
      payment.providerCheckoutId &&
      payment.providerCheckoutId !== paid.checkoutSessionId
    ) {
      return 'SESSION_MISMATCH';
    }

    if (!payment.providerCheckoutId && payment.checkoutState === 'READY') {
      return 'SESSION_MISSING';
    }

    if (
      payment.providerPaymentId &&
      payment.providerPaymentId !== paid.providerPaymentId
    ) {
      return 'PAYMENT_ID_MISMATCH';
    }

    if (
      !['PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(
        payment.status,
      ) ||
      (payment.status !== 'PENDING' &&
        (!payment.paidAt || !payment.providerPaymentId))
    ) {
      return 'PAYMENT_STATE_REVIEW';
    }

    return null;
  }

  private record(
    tx: Prisma.TransactionClient,
    event: Event,
    status: 'PROCESSED' | 'FAILED' | 'IGNORED',
    paymentId: string | null,
    errorMessage: string | null,
  ) {
    const data = {
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
        ...(REFUND_EVENTS.includes(event.type)
          ? { refunds: event.refunds, relatedPaymentId: event.relatedPaymentId }
          : {}),
        ...(event.type === PAYMENT_FAILED_EVENT
          ? { failed: event.failed, relatedPaymentId: event.relatedPaymentId }
          : {}),
      }),
    };

    return tx.paymentEvent.upsert({
      where: { providerEventId: event.id },
      create: data,
      update: data,
    });
  }
}
