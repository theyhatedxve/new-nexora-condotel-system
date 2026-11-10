import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Prisma } from '../generated/prisma/client.js';

import { object, REFUND_EVENTS } from './paymongo-webhook.payload.js';

import type { ProviderRefund } from './paymongo-refund.adapter.js';

export const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export type Outcome =
  | 'IGNORED'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'REVIEW_REQUIRED'
  | 'PROVIDER_REFERENCE_REQUIRED';

export type Operation = { key: string; fingerprint: string; target: string };

export function json(value: string | null | undefined) {
  try {
    return object(JSON.parse(value ?? 'null'));
  } catch {
    return null;
  }
}

export function reconciliationOperation(
  kind: string,
  target: string,
  requestId: string,
  actorId: string,
  fields: unknown,
): Operation {
  if (typeof requestId !== 'string' || !isUUID(requestId, '4'))
    throw new BadRequestException(
      'A UUID v4 request identifier is required.',
    );
  return {
    key: 'rec_' + hash('reconciliation:' + requestId.toLowerCase()),
    target,
    fingerprint: hash(JSON.stringify({ kind, target, actorId, fields })),
  };
}

export async function replayReconciliation(tx: Prisma.TransactionClient, op: Operation) {
  const saved = await tx.auditLog.findUnique({ where: { id: op.key } });
  if (!saved) return null;
  const proof = json(saved.detailsJson);
  if (
    saved.action !== 'payment.reconciliation.completed' ||
    saved.entityId !== op.target ||
    proof?.version !== 1 ||
    proof.fingerprint !== op.fingerprint ||
    ![
      'IGNORED',
      'PROCESSED',
      'DUPLICATE',
      'REVIEW_REQUIRED',
      'PROVIDER_REFERENCE_REQUIRED',
    ].includes(String(proof.outcome))
  ) {
    throw new ConflictException(
      'This request identifier belongs to a different reconciliation.',
    );
  }
  return {
    id: op.target,
    outcome: proof.outcome as Outcome,
    alreadyReconciled: true,
  };
}

export async function completeReconciliation(
  tx: Prisma.TransactionClient,
  op: Operation,
  actorId: string,
  outcome: Outcome,
) {
  await tx.auditLog.create({
    data: {
      id: op.key,
      actorUserId: actorId,
      action: 'payment.reconciliation.completed',
      entityType: 'PaymentReconciliation',
      entityId: op.target,
      detailsJson: JSON.stringify({
        version: 1,
        fingerprint: op.fingerprint,
        outcome,
      }),
    },
  });
  return { id: op.target, outcome, alreadyReconciled: false };
}

export async function holdReconciliation(
  tx: Prisma.TransactionClient,
  paymentId: string,
  op: Operation,
) {
  await tx.paymentEvent.create({
    data: {
      providerEventId: op.key,
      paymentId,
      eventType: 'nexora.reconciliation.review',
      status: 'FAILED',
      signatureVerified: false,
      processedAt: new Date(),
      errorMessage: 'PROVIDER_STATE_CONFLICT',
      payloadJson: JSON.stringify({
        version: 1,
        source: 'backend_reconciliation',
      }),
    },
  });
}

export function reconciliationFailure(error: unknown): never {
  if (error instanceof HttpException) throw error;
  throw new ServiceUnavailableException(
    'Reconciliation could not be saved. Retry with the same request identifier.',
  );
}

export async function clearRefundReviews(
  tx: Prisma.TransactionClient,
  outcome: ProviderRefund,
  reason: string,
  actorId: string,
) {
  const payment = await tx.payment.findUniqueOrThrow({
    where: { providerPaymentId: outcome.paymentId },
    select: { id: true },
  });
  const events = await tx.paymentEvent.findMany({
    where: {
      paymentId: payment.id,
      signatureVerified: true,
      eventType: { in: REFUND_EVENTS },
      errorMessage: { in: ['STALE_DELIVERY', 'REFUND_UNMATCHED'] },
    },
    take: 100,
  });
  for (const event of events) {
    const proof = json(event.payloadJson);
    if (
      proof?.version !== 1 ||
      proof.livemode !== false ||
      !Array.isArray(proof.refunds) ||
      proof.refunds.length !== 1 ||
      !event.providerCreatedAt
    )
      continue;
    const fact = object(proof.refunds[0]);
    const digest = hash(
      JSON.stringify({
        eventId: event.providerEventId,
        eventType: event.eventType,
        createdAt: event.providerCreatedAt.getTime() / 1000,
        livemode: false,
        paid: null,
        refunds: proof.refunds,
        relatedPaymentId: proof.relatedPaymentId,
      }),
    );
    if (
      proof.fingerprint !== digest ||
      fact?.id !== outcome.id ||
      fact.paymentId !== outcome.paymentId ||
      fact.amountCentavos !== outcome.amountCentavos ||
      fact.currency !== 'PHP' ||
      fact.livemode !== false ||
      fact.reason !== reason ||
      (fact.localRefundId !== null &&
        fact.localRefundId !== outcome.localRefundId) ||
      (fact.status !== 'PENDING' && fact.status !== outcome.status)
    )
      continue;
    await tx.paymentEvent.update({
      where: { id: event.id },
      data: {
        status: 'PROCESSED',
        errorMessage: null,
        processedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'payment.review.reconciled',
        entityType: 'PaymentEvent',
        entityId: event.id,
        detailsJson: JSON.stringify({
          version: 1,
          previousReason: event.errorMessage,
          originalFingerprint: digest,
        }),
      },
    });
  }
}
