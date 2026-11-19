import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { calculatePaymentSummary } from '../summary/payment-summary.js';
import { paymentEvidenceSelect } from '../summary/payment-evidence.js';

export const FINANCIAL_EXCEPTION_EVENT = 'nexora.financial.exception';

// These queue entries describe booking-level money issues.
// They are unsigned internal notices, not payment/provider evidence.
export async function refreshFinancialExceptionInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
  actorId: string | null = null,
): Promise<boolean> {
  const booking = await tx.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      payments: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { refunds: true, events: { select: paymentEvidenceSelect } },
      },
    },
  });
  const anchor = booking.payments.find((payment) =>
    payment.method === 'PAYMONGO' && payment.provider === 'PAYMONGO');
  if (!anchor) return false;

  let netPaidCentavos: number | null = null;
  let reason: string | null = null;
  try {
    const summary = calculatePaymentSummary(
      booking.totalAmountCentavos, booking.status, booking.payments,
    );
    netPaidCentavos = summary.netPaidCentavos;
    if (['CANCELLED', 'EXPIRED'].includes(booking.status) && netPaidCentavos > 0) {
      reason = 'CLOSED_BOOKING_CAPTURE';
    } else if (netPaidCentavos > booking.totalAmountCentavos) {
      reason = 'EXCESS_COLLECTION';
    } else if (booking.status === 'PENDING' && netPaidCentavos > 0) {
      reason = 'UNFULFILLED_CAPTURE';
    }
  } catch (error) {
    if (!(error instanceof ConflictException)) throw error;
    reason = 'LEDGER_REVIEW_REQUIRED';
  }

  const key = 'financial-exception:' + booking.id;
  const existing = await tx.paymentEvent.findUnique({ where: { providerEventId: key } });
  const payloadJson = JSON.stringify({
    version: 1, source: 'backend_financial_exception', reservationId: booking.id,
    reason, netPaidCentavos, bookedTotalCentavos: booking.totalAmountCentavos,
  });

  if (reason) {
    if (existing?.status === 'FAILED' && existing.errorMessage === reason &&
        existing.payloadJson === payloadJson) return true;
    const saved = await tx.paymentEvent.upsert({
      where: { providerEventId: key },
      create: {
        providerEventId: key, paymentId: anchor.id, eventType: FINANCIAL_EXCEPTION_EVENT,
        status: 'FAILED', signatureVerified: false,
        processedAt: new Date(), errorMessage: reason, payloadJson,
      },
      update: { status: 'FAILED', processedAt: new Date(), errorMessage: reason, payloadJson },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: existing ? 'payment.financial_exception.updated' : 'payment.financial_exception.opened',
        entityType: 'PaymentEvent', entityId: saved.id,
        detailsJson: JSON.stringify({
          previousEvidence: existing?.payloadJson ?? null,
          currentEvidence: payloadJson,
        }),
      },
    });
  } else if (existing?.status === 'FAILED' &&
             existing.eventType === FINANCIAL_EXCEPTION_EVENT && !existing.signatureVerified) {
    await tx.paymentEvent.update({
      where: { id: existing.id },
      data: { status: 'PROCESSED', errorMessage: null, processedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorId, action: 'payment.financial_exception.resolved',
        entityType: 'PaymentEvent', entityId: existing.id,
        detailsJson: JSON.stringify({
          originalEvidence: existing.payloadJson, resolutionEvidence: payloadJson,
        }),
      },
    });
  }
  return reason !== null;
}
