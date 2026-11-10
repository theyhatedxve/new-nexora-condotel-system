import { ConflictException } from '@nestjs/common';

import type { Prisma, Refund } from '../generated/prisma/client.js';

import { hasVerifiedPaymongoEvidence, paymentEvidenceSelect } from './payment-evidence.js';

import { type ProviderRefund } from './paymongo-refund.adapter.js';
import { CLAIM, fingerprint } from './refund-policy.js';

export async function assertRefundClaim(
  tx: Prisma.TransactionClient,
  refund: Refund,
  expected: string,
) {
  const audits = await tx.auditLog.findMany({
    where: {
      action: CLAIM,
      entityType: 'Refund',
      entityId: refund.id,
    },
    select: {
      actorUserId: true,
      detailsJson: true,
    },
    take: 2,
  });

  let value: unknown;

  try {
    value = JSON.parse(audits[0]?.detailsJson ?? 'null');
  } catch {
    value = null;
  }

  if (
    audits.length !== 1 ||
    audits[0].actorUserId !== refund.processedByUserId ||
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('version' in value) ||
    value.version !== 1 ||
    !('requestFingerprint' in value) ||
    value.requestFingerprint !== expected
  ) {
    throw new ConflictException('Refund request evidence requires review.');
  }
}

export async function updateRefundedPayment(tx: Prisma.TransactionClient, id: string) {
  const payment = await tx.payment.findUniqueOrThrow({
    where: { id },
    include: { refunds: true },
  });

  const completed = payment.refunds
    .filter((refund) => refund.status === 'COMPLETED')
    .reduce((sum, refund) => sum + refund.amountCentavos, 0);

  if (
    !Number.isSafeInteger(completed) ||
    completed < 0 ||
    completed > payment.amountCentavos
  ) {
    throw new ConflictException('Refund totals require review.');
  }

  await tx.payment.update({
    where: { id },
    data: {
      status:
        completed === 0
          ? 'PAID'
          : completed === payment.amountCentavos
            ? 'REFUNDED'
            : 'PARTIALLY_REFUNDED',
    },
  });
}

export async function settlePaymongoRefund(
  tx: Prisma.TransactionClient,
  id: string,
  outcome: ProviderRefund,
): Promise<'PROCESSED' | 'DUPLICATE' | 'REVIEW_REQUIRED'> {
  const refund = await tx.refund.findUnique({ where: { id } });
  if (!refund?.processedByUserId) return 'REVIEW_REQUIRED';

  const payment = await tx.payment.findUnique({
    where: { id: refund.paymentId },
    include: {
      events: { select: paymentEvidenceSelect },
      refunds: true,
      reservation: { select: { roomType: { select: { propertyId: true } } } },
    },
  });

  const properties = await tx.property.findMany({
    select: { id: true },
    take: 2,
  });

  if (
    !payment ||
    properties.length !== 1 ||
    payment.reservation.roomType.propertyId !== properties[0].id ||
    payment.method !== 'PAYMONGO' ||
    payment.currency !== 'PHP' ||
    !hasVerifiedPaymongoEvidence(payment) ||
    !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status) ||
    !Number.isSafeInteger(refund.amountCentavos) ||
    refund.amountCentavos < 100 ||
    outcome.livemode !== false ||
    outcome.currency !== 'PHP' ||
    outcome.localRefundId !== refund.id ||
    outcome.paymentId !== payment.providerPaymentId ||
    outcome.amountCentavos !== refund.amountCentavos ||
    !/^ref_[A-Za-z0-9_]{1,96}$/.test(outcome.id) ||
    !['PENDING', 'COMPLETED', 'FAILED'].includes(outcome.status) ||
    (refund.providerRefundId && refund.providerRefundId !== outcome.id)
  )
    return 'REVIEW_REQUIRED';

  try {
    await assertRefundClaim(
      tx,
      refund,
      fingerprint(
        payment.id,
        refund.processedByUserId,
        refund.amountCentavos,
        refund.reason,
        false,
      ),
    );
  } catch (error) {
    if (error instanceof ConflictException) return 'REVIEW_REQUIRED';
    throw error;
  }

  if (
    await tx.refund.findFirst({
      where: { providerRefundId: outcome.id, id: { not: id } },
      select: { id: true },
    })
  )
    return 'REVIEW_REQUIRED';

  const completed = payment.refunds
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + r.amountCentavos, 0);

  const pending = payment.refunds
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amountCentavos, 0);

  const expected =
    completed === 0
      ? 'PAID'
      : completed === payment.amountCentavos
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED';

  if (
    ![completed, pending, completed + pending].every(Number.isSafeInteger) ||
    completed < 0 ||
    pending < 0 ||
    completed + pending > payment.amountCentavos ||
    payment.status !== expected
  )
    return 'REVIEW_REQUIRED';

  if (refund.status !== 'PENDING') {
    if (
      refund.providerRefundId === outcome.id &&
      (refund.status === outcome.status ||
        (['COMPLETED', 'FAILED'].includes(refund.status) &&
          outcome.status === 'PENDING'))
    )
      return 'DUPLICATE';

    return 'REVIEW_REQUIRED';
  }

  if (refund.providerRefundId === outcome.id && outcome.status === 'PENDING')
    return 'DUPLICATE';

  await tx.refund.update({
    where: { id },
    data: {
      providerRefundId: outcome.id,
      status: outcome.status,
      completedAt: outcome.status === 'COMPLETED' ? new Date() : null,
    },
  });

  await updateRefundedPayment(tx, payment.id);

  await tx.auditLog.create({
    data: {
      actorUserId: refund.processedByUserId,
      action: 'payment.refund.' + outcome.status.toLowerCase(),
      entityType: 'Refund',
      entityId: id,
      detailsJson: JSON.stringify({ version: 1, source: 'paymongo_test' }),
    },
  });

  return 'PROCESSED';
}
