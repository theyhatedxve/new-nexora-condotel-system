import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GUEST_BOOKING_POLICY_VERSION } from '../reservations/guest-booking-policy.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import { expirePendingHoldsInTx } from '../reservations/reservation-lifecycle.js';
import { hasPaymentReview, paymentEvidenceSelect } from './payment-evidence.js';
import { PaymongoCheckoutExpirationAdapter } from './paymongo-checkout-expiration.adapter.js';

const REQUESTED = 'payment.checkout.expiration_requested';
const CONFIRMED = 'payment.checkout.expiration_confirmed';
const REVIEW = 'payment.checkout.expiration_review_required';
const RETRY = 'payment.checkout.expiration_retry';

const ledgerSelect = {
  id: true,
  method: true,
  provider: true,
  status: true,
  currency: true,
  amountCentavos: true,
  paidAt: true,
  providerPaymentId: true,
  providerCheckoutId: true,
  checkoutState: true,
  refunds: { select: { id: true } },
  events: { select: paymentEvidenceSelect },
} as const;

type LedgerPayment = Prisma.PaymentGetPayload<{ select: typeof ledgerSelect }>;
type Outcome = 'EXPIRED' | 'REVIEW_REQUIRED' | 'RETRY';

function dueBookingWhere(propertyId: string, now: Date): Prisma.ReservationWhereInput {
  return {
    bookingPolicyVersion: GUEST_BOOKING_POLICY_VERSION,
    paymentPreference: 'PAYMONGO',
    roomType: { propertyId },
    OR: [
      { status: { in: ['EXPIRED', 'CANCELLED'] } },
      { status: 'PENDING', holdExpiresAt: { lte: now } },
    ],
  };
}

function findPayment(
  tx: Prisma.TransactionClient,
  paymentId: string,
  propertyId: string,
  now: Date,
) {
  return tx.payment.findFirst({
    where: {
      id: paymentId,
      method: 'PAYMONGO',
      provider: 'PAYMONGO',
      status: 'PENDING',
      providerCheckoutId: { not: null },
      reservation: dueBookingWhere(propertyId, now),
    },
    select: {
      id: true,
      providerCheckoutId: true,
      reservation: {
        select: {
          id: true,
          status: true,
          holdExpiresAt: true,
          totalAmountCentavos: true,
          payments: { select: ledgerSelect },
        },
      },
    },
  });
}

function safeUnpaidLedger(
  payments: readonly LedgerPayment[],
  paymentId: string,
  sessionId: string,
  total: number,
): boolean {
  if (payments.length !== 1 || !Number.isSafeInteger(total) || total <= 0) return false;
  const payment = payments[0];
  return payment.id === paymentId &&
    payment.providerCheckoutId === sessionId &&
    payment.method === 'PAYMONGO' && payment.provider === 'PAYMONGO' &&
    payment.status === 'PENDING' && payment.currency === 'PHP' &&
    payment.amountCentavos === total &&
    payment.paidAt === null && payment.providerPaymentId === null &&
    ['READY', 'UNKNOWN'].includes(payment.checkoutState ?? '') &&
    payment.refunds.length === 0 && !hasPaymentReview(payment) &&
    !payment.events.some((event) => event.signatureVerified);
}

async function finished(tx: Prisma.TransactionClient, paymentId: string) {
  return tx.auditLog.findFirst({
    where: {
      entityType: 'Payment', entityId: paymentId,
      action: { in: [CONFIRMED, REVIEW] },
    },
    select: { id: true },
  });
}

@Injectable()
export class GuestBookingDeadlineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymongoCheckoutExpirationAdapter,
  ) {}

  async runOnce(sessionLimit = 5) {
    if (!Number.isInteger(sessionLimit) || sessionLimit < 1 || sessionLimit > 10) {
      throw new BadRequestException('Session batch must be from 1 to 10.');
    }

    const prepared = await withInventoryWrite(this.prisma, async (tx) => {
      const properties = await tx.property.findMany({ select: { id: true }, take: 2 });
      if (properties.length !== 1) {
        throw new InternalServerErrorException('Exactly one property must be configured.');
      }
      const propertyId = properties[0].id;
      const now = new Date();
      // Only holds with no payment ledger can expire without provider processing.
      const local = await expirePendingHoldsInTx(tx, { propertyId, now });
      const candidates = await tx.$queryRaw<{ id: string }[]>`
        SELECT p."id"
        FROM "Payment" p
        JOIN "Reservation" r ON r."id" = p."reservationId"
        JOIN "RoomType" t ON t."id" = r."roomTypeId"
        WHERE t."propertyId" = ${propertyId}
          AND r."bookingPolicyVersion" = ${GUEST_BOOKING_POLICY_VERSION}
          AND r."paymentPreference" = 'PAYMONGO'
          AND (
            r."status" IN ('EXPIRED', 'CANCELLED')
            OR (r."status" = 'PENDING' AND r."holdExpiresAt" <= ${now})
          )
          AND p."method" = 'PAYMONGO' AND p."provider" = 'PAYMONGO'
          AND p."status" = 'PENDING' AND p."providerCheckoutId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "AuditLog" a
            WHERE a."entityType" = 'Payment' AND a."entityId" = p."id"
              AND a."action" IN (${CONFIRMED}, ${REVIEW})
          )
        ORDER BY COALESCE((
          SELECT MAX(a.rowid) FROM "AuditLog" a
          WHERE a."entityType" = 'Payment' AND a."entityId" = p."id"
            AND a."action" = ${REQUESTED}
        ), 0), p."id"
        LIMIT ${sessionLimit}
      `;
      return { propertyId, local, candidates };
    });

    let closedSessions = 0;
    let retrySessions = 0;
    let reviewSessions = 0;
    let expiredCount = prepared.local.expiredCount;
    let releasedAssignmentCount = prepared.local.releasedAssignmentCount;

    for (const candidate of prepared.candidates) {
      const input = await withInventoryWrite(this.prisma, async (tx) => {
        const payment = await findPayment(tx, candidate.id, prepared.propertyId, new Date());
        if (!payment?.providerCheckoutId || await finished(tx, payment.id)) return null;
        await tx.payment.update({ where: { id: payment.id }, data: { checkoutUrl: null } });
        await tx.auditLog.create({
          data: { action: REQUESTED, entityType: 'Payment', entityId: payment.id },
        });
        return {
          paymentId: payment.id,
          checkoutSessionId: payment.providerCheckoutId,
          safe: safeUnpaidLedger(
            payment.reservation.payments, payment.id,
            payment.providerCheckoutId, payment.reservation.totalAmountCentavos,
          ),
        };
      });
      if (!input) continue;

      let outcome: Outcome = 'REVIEW_REQUIRED';
      if (input.safe) {
        try {
          // Network requests never run inside the inventory transaction.
          outcome = await this.provider.close({
            paymentId: input.paymentId,
            checkoutSessionId: input.checkoutSessionId,
          });
        } catch (error) {
          if (!(error instanceof ServiceUnavailableException)) throw error;
          outcome = 'RETRY';
        }
      }

      const saved = await withInventoryWrite(this.prisma, async (tx) => {
        const now = new Date();
        const payment = await findPayment(tx, input.paymentId, prepared.propertyId, now);
        if (!payment || payment.providerCheckoutId !== input.checkoutSessionId ||
            await finished(tx, input.paymentId)) return null;
        const booking = payment.reservation;
        // Recheck after the provider call: a webhook or staff write may have won.
        const finalOutcome: Outcome = safeUnpaidLedger(
          booking.payments, payment.id, input.checkoutSessionId, booking.totalAmountCentavos,
        ) ? outcome : 'REVIEW_REQUIRED';

        let expired = 0;
        let released = 0;
        if (finalOutcome === 'EXPIRED' && booking.status === 'PENDING') {
          const claimed = await tx.reservation.updateMany({
            where: {
              id: booking.id,
              ...dueBookingWhere(prepared.propertyId, now),
              status: 'PENDING',
              holdExpiresAt: { equals: booking.holdExpiresAt!, lte: now },
            },
            data: { status: 'EXPIRED' },
          });
          if (claimed.count !== 1) return null;
          const assignments = await tx.roomAssignment.updateMany({
            where: { reservationId: booking.id, releasedAt: null },
            data: { releasedAt: now },
          });
          expired = 1;
          released = assignments.count;
          await tx.auditLog.create({
            data: {
              action: 'reservation.hold_expired', entityType: 'Reservation', entityId: booking.id,
              detailsJson: JSON.stringify({
                holdExpiresAt: booking.holdExpiresAt!.toISOString(),
                paymentId: payment.id,
                providerCheckoutId: input.checkoutSessionId,
                releasedAssignmentCount: released,
              }),
            },
          });
        }
        if (finalOutcome === 'REVIEW_REQUIRED') {
          // Internal review evidence is explicitly unsigned; it is not proof of payment.
          await tx.paymentEvent.upsert({
            where: { providerEventId: `hold-expiration-review:${payment.id}` },
            create: {
              providerEventId: `hold-expiration-review:${payment.id}`,
              paymentId: payment.id,
              eventType: 'nexora.reconciliation.review',
              status: 'FAILED', signatureVerified: false,
              payloadJson: JSON.stringify({ version: 1, source: 'backend_reconciliation' }),
              processedAt: now, errorMessage: 'HOLD_EXPIRATION_REVIEW_REQUIRED',
            },
            update: {},
          });
        }
        await tx.auditLog.create({
          data: {
            action: finalOutcome === 'EXPIRED' ? CONFIRMED :
              finalOutcome === 'REVIEW_REQUIRED' ? REVIEW : RETRY,
            entityType: 'Payment', entityId: payment.id,
            detailsJson: JSON.stringify({
              version: 1, providerCheckoutId: input.checkoutSessionId, outcome: finalOutcome,
            }),
          },
        });
        return { outcome: finalOutcome, expired, released };
      });
      if (!saved) continue;
      expiredCount += saved.expired;
      releasedAssignmentCount += saved.released;
      if (saved.outcome === 'EXPIRED') closedSessions += 1;
      else if (saved.outcome === 'REVIEW_REQUIRED') reviewSessions += 1;
      else retrySessions += 1;
    }

    const unknownSessions = await this.prisma.payment.count({
      where: {
        method: 'PAYMONGO', provider: 'PAYMONGO', status: 'PENDING',
        providerCheckoutId: null,
        reservation: dueBookingWhere(prepared.propertyId, new Date()),
      },
    });
    return {
      ...prepared.local, expiredCount, releasedAssignmentCount,
      closedSessions, retrySessions, reviewSessions, unknownSessions,
    };
  }
}
