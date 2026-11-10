import { checkoutResponse } from './checkout-response.js';
import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
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
import { requireBookingSession } from '../reservations/booking-access-security.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import { calculatePaymentSummary } from './payment-summary.js';
import { PaymongoAdapter } from './paymongo.adapter.js';
import { hasVerifiedPaymongoEvidence, paymentEvidenceSelect } from './payment-evidence.js';
import {
  assertCheckoutBookingEligible,
  isPendingOnlineBooking,
} from './pending-online-booking.js';

type Access =
  | {
      kind: 'user';
      reservationId: string;
      actor: AuthenticatedUser | undefined;
    }
  | {
      kind: 'session';
      cookie: unknown;
      expectedReservationNumber?: string;
    };

    const digest = (value: string): string =>
  createHash('sha256')
    .update(value)
    .digest('hex');

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService, private readonly ownership: OwnershipService,
    private readonly provider: PaymongoAdapter) {}

  startForUser(id: string, requestId: string, actor: AuthenticatedUser | undefined) {
    return this.start({ kind: 'user', reservationId: id, actor }, requestId);
  }

    startForSession(
    cookie: unknown,
    requestId: string,
    expectedReservationNumber?: string,
  ) {
    return this.start(
      {
        kind: 'session',
        cookie,
        expectedReservationNumber,
      },
      requestId,
    );
  }

  currentForUser(id: string, actor: AuthenticatedUser | undefined) {
    return this.current({ kind: 'user', reservationId: id, actor });
  }

    currentForSession(
    cookie: unknown,
    expectedReservationNumber?: string,
  ) {
    return this.current({
      kind: 'session',
      cookie,
      expectedReservationNumber,
    });
  }

  private async booking(tx: Prisma.TransactionClient, access: Access) {
    const id = access.kind === 'session'
      ? (await requireBookingSession(tx, access.cookie)).reservationId : access.reservationId;

    if (access.kind === 'user') {
      await this.ownership.assertReservationAccess(access.actor, id, ['ADMIN', 'MANAGER', 'RECEPTIONIST'], tx);
    }

    const properties = await tx.property.findMany({ select: { id: true }, take: 2 });

    if (properties.length !== 1) {
      throw new InternalServerErrorException('Exactly one property must be configured.');
    }

    const booking = await tx.reservation.findFirst({
      where: { id, roomType: { propertyId: properties[0].id } },
      include: { payments: { include: { refunds: true, events: { select: paymentEvidenceSelect } } } },
    });

    if (!booking) throw new NotFoundException('Record not found.');

        if (
      access.kind === 'session' &&
      access.expectedReservationNumber !== undefined &&
      booking.reservationNumber !==
        access.expectedReservationNumber
    ) {
      throw new NotFoundException(
        'Record not found.',
      );
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
      const invalidInitialLedger =
        booking.payments.length > 1 ||
        booking.payments.some(
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

  private reserve(access: Access, requestId: string) {
    if (!isUUID(requestId, '4')) {
      throw new BadRequestException('A UUID v4 requestId is required.');
    }

    const key = digest(`paymongo-checkout:${requestId.toLowerCase()}`);

    return withInventoryWrite(this.prisma, async (tx) => {
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
      const actorId = access.kind === 'user' ? access.actor!.id : null;
      const scope = actorId ?? `booking-session:${booking.id}`;
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
    });
  }

  private async start(access: Access, requestId: string) {
    const prepared = await this.reserve(access, requestId);

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
