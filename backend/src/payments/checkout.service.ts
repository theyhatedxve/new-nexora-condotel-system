import { PaymongoCheckoutExpirationAdapter } from './paymongo/paymongo-checkout-expiration.adapter.js';
import { activeOnlineAttempts, canReplaceAttempt, isRetiredAttempt, CLOSED_UNPAID_EVENT } from './online-payment-attempts.js';
import { checkoutResponse } from './checkout-response.js';
import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Payment, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  OwnershipService,
  type AuthenticatedUser,
} from '../common/ownership/ownership.service.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import { calculatePaymentSummary } from './payment-summary.js';
import { PaymongoAdapter } from './paymongo/paymongo.adapter.js';
import { hasVerifiedPaymongoEvidence, paymentEvidenceSelect } from './payment-evidence.js';
import {
  assertCheckoutBookingEligible,
  isPendingOnlineBooking,
} from './pending-online-booking.js';

type Access = {
  reservationId: string;
  actor: AuthenticatedUser | undefined;
};

    const digest = (value: string): string =>
  createHash('sha256')
    .update(value)
    .digest('hex');

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService, private readonly ownership: OwnershipService,
    private readonly provider: PaymongoAdapter,
    private readonly expiration: PaymongoCheckoutExpirationAdapter = new PaymongoCheckoutExpirationAdapter(),
  ) {}

  startForUser(
    id: string,
    requestId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.start(
      { reservationId: id, actor },
      requestId,
    );
  }

  currentForUser(
    id: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.current({
      reservationId: id,
      actor,
    });
  }

  async retryTargetForUser(id: string, actor: AuthenticatedUser | undefined) {
    if (actor?.role !== 'GUEST') throw new ForbiddenException('Guest permission is required.');
    return this.prisma.$transaction(async (tx) => {
      const booking = await this.booking(tx, { reservationId: id, actor });
      if (!isPendingOnlineBooking(booking)) return { available: false, paymentId: null };
      this.quote(booking);
      const active = activeOnlineAttempts(booking);
      const payment = active.length === 1 ? active[0] : null;
      return {
        available: Boolean(payment && canReplaceAttempt(payment, booking.totalAmountCentavos)),
        paymentId: payment?.id ?? null,
      };
    });
  }

  private async resumeRetryInTx(
    tx: Prisma.TransactionClient,
    access: Access,
    requestId: string,
    booking: Awaited<ReturnType<CheckoutService['booking']>>,
  ) {
    this.quote(booking);
    const active = activeOnlineAttempts(booking);
    if (active.length === 1) {
      return { reused: true as const, response: checkoutResponse(active[0]) };
    }
    return this.reserve(access, requestId, tx);
  }

  async retryForUser(
    id: string,
    previousPaymentId: string,
    requestId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    if (actor?.role !== 'GUEST') throw new ForbiddenException('Guest permission is required.');
    if (!isUUID(requestId, '4') || typeof previousPaymentId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(previousPaymentId)) {
      throw new BadRequestException('Valid retry identifiers are required.');
    }
    const access: Access = { reservationId: id, actor };
    const before = await withInventoryWrite(this.prisma, async (tx) => {
      const booking = await this.booking(tx, access);
      const previous = booking.payments.find((payment) => payment.id === previousPaymentId);
      if (!previous) throw new NotFoundException('Record not found.');
      if (isRetiredAttempt(previous, booking.totalAmountCentavos)) {
        return { kind: 'READY' as const, prepared: await this.resumeRetryInTx(tx, access, requestId, booking) };
      }
      this.quote(booking);
      if (previous.status === 'PAID' && hasVerifiedPaymongoEvidence(previous)) {
        return { kind: 'READY' as const, prepared: { reused: true as const, response: checkoutResponse(previous) } };
      }
      const active = activeOnlineAttempts(booking);
      if (!isPendingOnlineBooking(booking) || active.length !== 1 ||
          active[0].id !== previous.id || !canReplaceAttempt(previous, booking.totalAmountCentavos)) {
        throw new ConflictException('The existing attempt cannot be safely replaced. Check payment records.');
      }
      await tx.payment.update({ where: { id: previous.id }, data: { checkoutUrl: null } });
      await tx.auditLog.create({
        data: { actorUserId: actor.id, action: 'payment.checkout.retry_requested', entityType: 'Payment', entityId: previous.id },
      });
      return {
        kind: 'CLOSE' as const,
        paymentId: previous.id,
        checkoutSessionId: previous.providerCheckoutId!,
      };
    });
    if (before.kind === 'READY') return this.finish(access, before.prepared);

    let outcome: 'EXPIRED' | 'REVIEW_REQUIRED' | 'UNKNOWN';
    try {
      outcome = await this.expiration.close({
        paymentId: before.paymentId, checkoutSessionId: before.checkoutSessionId,
      });
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      outcome = 'UNKNOWN';
    }

    if (outcome !== 'EXPIRED') {
      await withInventoryWrite(this.prisma, async (tx) => {
        await this.ownership.assertReservationAccess(actor, id, [], tx);
        const previous = await tx.payment.findFirst({
          where: {
            id: before.paymentId, reservationId: id,
            status: outcome === 'REVIEW_REQUIRED' ? { in: ['PENDING', 'FAILED'] } : 'PENDING',
            providerCheckoutId: before.checkoutSessionId,
          },
        });
        if (!previous) return;
        await tx.payment.update({
          where: { id: previous.id }, data: { checkoutState: 'UNKNOWN', checkoutUrl: null },
        });
        if (outcome === 'REVIEW_REQUIRED') {
          await tx.paymentEvent.upsert({
            where: { providerEventId: 'checkout-retry-review:' + previous.id },
            create: {
              providerEventId: 'checkout-retry-review:' + previous.id,
              paymentId: previous.id, eventType: 'nexora.reconciliation.review',
              status: 'FAILED', signatureVerified: false, processedAt: new Date(),
              errorMessage: 'CHECKOUT_RETRY_REVIEW_REQUIRED',
              payloadJson: JSON.stringify({ version: 1, source: 'backend_reconciliation' }),
            },
            update: {},
          });
        }
        await tx.auditLog.create({
          data: {
            actorUserId: actor.id, entityType: 'Payment', entityId: previous.id,
            action: outcome === 'UNKNOWN' ? 'payment.checkout.retry_uncertain' : 'payment.checkout.retry_review_required',
          },
        });
      });
      throw new ConflictException('The previous checkout is unresolved. No replacement was created.');
    }

    const prepared = await withInventoryWrite(this.prisma, async (tx) => {
      const booking = await this.booking(tx, access);
      const previous = booking.payments.find((payment) => payment.id === before.paymentId);
      if (!previous || previous.providerCheckoutId !== before.checkoutSessionId) {
        throw new ConflictException('The checkout changed. Refresh payment records.');
      }
      if (isRetiredAttempt(previous, booking.totalAmountCentavos)) {
        return this.resumeRetryInTx(tx, access, requestId, booking);
      }
      this.quote(booking);
      if (previous.status === 'PAID' && hasVerifiedPaymongoEvidence(previous)) {
        return { reused: true as const, response: checkoutResponse(previous) };
      }
      const active = activeOnlineAttempts(booking);
      if (!isPendingOnlineBooking(booking) || active.length !== 1 ||
          active[0].id !== previous.id || !canReplaceAttempt(previous, booking.totalAmountCentavos)) {
        throw new ConflictException('Payment evidence changed. No replacement was created.');
      }
      await tx.payment.update({
        where: { id: previous.id }, data: { status: 'FAILED', checkoutUrl: null },
      });
      await tx.paymentEvent.create({
        data: {
          providerEventId: 'checkout-closed-unpaid:' + previous.id,
          paymentId: previous.id, eventType: CLOSED_UNPAID_EVENT,
          status: 'PROCESSED', signatureVerified: false, processedAt: new Date(),
          payloadJson: JSON.stringify({
            version: 1, source: 'backend_checkout_retry',
            checkoutSessionId: before.checkoutSessionId,
            amountCentavos: previous.amountCentavos, currency: previous.currency,
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id, action: 'payment.checkout.closed_unpaid', entityType: 'Payment', entityId: previous.id,
          detailsJson: JSON.stringify({
            reservationId: id,
            replacementRequestKeyHash: digest(`paymongo-checkout:${requestId.toLowerCase()}`),
            holdExpiresAt: booking.holdExpiresAt?.toISOString(),
          }),
        },
      });
      // Retirement and replacement reservation commit together.
      return this.reserve(access, requestId, tx);
    });
    return this.finish(access, prepared);
  }

  private async booking(
    tx: Prisma.TransactionClient,
    access: Access,
  ) {
    const id = access.reservationId;

    await this.ownership.assertReservationAccess(
      access.actor,
      id,
      ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'],
      tx,
    );

    const properties = await tx.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const booking = await tx.reservation.findFirst({
      where: {
        id,
        roomType: {
          propertyId: properties[0].id,
        },
      },
      include: {
        payments: {
          include: {
            refunds: true,
            events: {
              select: paymentEvidenceSelect,
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Record not found.');
    }

    assertCheckoutBookingEligible(booking);

    return booking;
  }

    private quote(
    booking: Awaited<
      ReturnType<CheckoutService['booking']>
    >,
  ) {
    if (isPendingOnlineBooking(booking)) {
      const attempts = activeOnlineAttempts(booking);
      const invalidInitialLedger =
        attempts.length > 1 ||
        attempts.some(
          (payment) =>
            payment.method !== 'PAYMONGO' ||
            payment.provider !== 'PAYMONGO' ||
            payment.status !== 'PENDING' ||
            payment.currency !== 'PHP' ||
            payment.amountCentavos !==
              booking.totalAmountCentavos ||
            payment.refunds.length > 0,
        );

      if (invalidInitialLedger) {
        throw new ConflictException(
          'The initial online payment requires financial review.',
        );
      }
    }

    const summary = calculatePaymentSummary(
      booking.totalAmountCentavos,
      booking.status,
      booking.payments,
    );

    if (
      summary.requiresReview ||
      summary.balanceDueCentavos === null
    ) {
      throw new ConflictException(
        'This booking requires financial review.',
      );
    }

    return summary.balanceDueCentavos;
  }

  private current(access: Access) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await this.booking(tx, access);
      const amount = this.quote(booking);
      const pending = booking.payments.filter((payment) => payment.status === 'PENDING');

      if (pending.length === 0) {
        const verified = booking.payments.find(
          (payment) => payment.status === 'PAID' && hasVerifiedPaymongoEvidence(payment),
        );

        if (amount === 0 && verified) return checkoutResponse(verified);

        return { state: 'NONE' as const, amountCentavos: amount, checkoutUrl: null };
      }

      if (pending.length !== 1 || pending[0].method !== 'PAYMONGO' || pending[0].amountCentavos !== amount) {
        throw new ConflictException('Existing payment attempts require financial review.');
      }

      return checkoutResponse(pending[0]);
    });
  }

  private reserve(access: Access, requestId: string, transaction?: Prisma.TransactionClient) {
    if (!isUUID(requestId, '4')) {
      throw new BadRequestException('A UUID v4 requestId is required.');
    }

    const key = digest(`paymongo-checkout:${requestId.toLowerCase()}`);

    const claim = async (tx: Prisma.TransactionClient) => {
      const booking = await this.booking(tx, access);
      const amount = this.quote(booking);

      const existing = await tx.payment.findUnique({
        where: { checkoutRequestKeyHash: key },
        include: { events: { select: paymentEvidenceSelect } },
      });

      if (!existing && amount <= 0) {
        throw new ConflictException('No remaining balance is available for checkout.');
      }

      const settings = this.provider.settings();
      const actorId = access.actor!.id;
      const scope = actorId;
      const verifiedPaidRetry = existing?.status === 'PAID' && hasVerifiedPaymongoEvidence(existing);

      // A settled request keeps its original amount; the remaining balance is now zero.
      const requestAmount = existing && verifiedPaidRetry ? existing.amountCentavos : amount;

      const fingerprint = digest(JSON.stringify({
        bookingId: booking.id,
        scope,
        amount: requestAmount,
        currency: 'PHP',
        returnUrl: settings.returnUrl,
        methods: settings.methods,
      }));

      if (existing) {
        if (
          existing.reservationId !== booking.id ||
          existing.method !== 'PAYMONGO' ||
          existing.provider !== 'PAYMONGO' ||
          existing.currency !== 'PHP' ||
          existing.checkoutRequestFingerprint !== fingerprint
        ) {
          throw new ConflictException('This request identifier was already used with different checkout details.');
        }

        if (
          verifiedPaidRetry &&
          (amount !== 0 || booking.payments.some((payment) => payment.status === 'PENDING'))
        ) {
          throw new ConflictException('The payment balance changed. Check the booking payment summary.');
        }

        return { reused: true as const, response: checkoutResponse(existing) };
      }

      if (booking.payments.some((payment) => payment.status === 'PENDING')) {
        throw new ConflictException('An existing attempt must be checked before starting another checkout.');
      }

      const payment = await tx.payment.create({
        data: {
          reservationId: booking.id,
          method: 'PAYMONGO',
          status: 'PENDING',
          amountCentavos: amount,
          currency: 'PHP',
          provider: 'PAYMONGO',
          checkoutState: 'CREATING',
          checkoutRequestKeyHash: key,
          checkoutRequestFingerprint: fingerprint,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: 'payment.checkout.requested',
          entityType: 'Payment',
          entityId: payment.id,
        },
      });

      return { reused: false as const, payment, settings, actorId, reference: booking.reservationNumber };
    };
    return transaction ? claim(transaction) : withInventoryWrite(this.prisma, claim);
  }

  private async start(access: Access, requestId: string) {
    const prepared = await this.reserve(access, requestId);
    return this.finish(access, prepared);
  }

  private async finish(
    access: Access,
    prepared: Awaited<ReturnType<CheckoutService['reserve']>>,
  ) {
    if (prepared.reused) return prepared.response;

    // Exactly one caller owns creation. No provider call runs inside a DB transaction.
    let session: { id: string; url: string } | undefined;

    try {
      session = await this.provider.create({
        paymentId: prepared.payment.id,
        reference: prepared.reference,
        amountCentavos: prepared.payment.amountCentavos,
      }, prepared.settings);

      return await this.saveReady(access, prepared.payment, session, prepared.actorId);
    } catch {
      // Any uncertain result stays blocked, including a crash after provider creation.
      // Never log raw provider errors, credentials or checkout URLs.
      try {
        await this.saveUnknown(prepared.payment.id, prepared.actorId, session?.id);
      } catch {
        throw new ServiceUnavailableException('Checkout requires review. Check the existing attempt; do not start another.');
      }

      return { state: 'UNKNOWN' as const, amountCentavos: prepared.payment.amountCentavos, checkoutUrl: null };
    }
  }

  private saveReady(access: Access, payment: Payment, session: { id: string; url: string }, actorId: string | null) {
    return withInventoryWrite(this.prisma, async (tx) => {
      const booking = await this.booking(tx, access);
      const current = booking.payments.find((row) => row.id === payment.id);

      if (current?.status === 'PAID' && current.providerCheckoutId === session.id && hasVerifiedPaymongoEvidence(current)) {
        this.quote(booking);
        return checkoutResponse(current);
      }

      if (this.quote(booking) !== payment.amountCentavos) {
        throw new ConflictException('The payment balance changed.');
      }

      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING', checkoutState: 'CREATING' },
        data: { checkoutState: 'READY', providerCheckoutId: session.id, checkoutUrl: session.url },
      });

      if (updated.count !== 1) throw new ConflictException('The payment attempt changed.');

      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: 'payment.checkout.ready',
          entityType: 'Payment',
          entityId: payment.id,
        },
      });

      return checkoutResponse(await tx.payment.findUniqueOrThrow({ where: { id: payment.id } }));
    });
  }

  private saveUnknown(paymentId: string, actorId: string | null, sessionId: string | undefined) {
    return withInventoryWrite(this.prisma, async (tx) => {
      const changed = await tx.payment.updateMany({
        where: { id: paymentId, status: 'PENDING', checkoutState: 'CREATING' },
        data: { checkoutState: 'UNKNOWN', ...(sessionId ? { providerCheckoutId: sessionId } : {}) },
      });

      if (changed.count === 1) {
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: 'payment.checkout.unknown',
            entityType: 'Payment',
            entityId: paymentId,
          },
        });
      }
    });
  }
}
