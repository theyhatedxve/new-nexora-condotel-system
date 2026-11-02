import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Prisma, Refund } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import {
  REFUND_REASONS,
  type CreateRefundDto,
} from './dto/create-refund.dto.js';
import {
  hasPaymentReview,
  hasVerifiedPaymongoEvidence,
  paymentEvidenceSelect,
} from './payment-evidence.js';
import { calculatePaymentSummary } from './payment-summary.js';
import {
  PaymongoRefundAdapter,
  type ProviderRefund,
} from './paymongo-refund.adapter.js';

const ROLES = ['ADMIN', 'MANAGER'];
const CLAIM = 'payment.refund.requested';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const fingerprint = (
  paymentId: string,
  actorId: string,
  amountCentavos: number,
  reason: string,
  cash: boolean,
) =>
  hash(
    JSON.stringify({
      operation: 'refund-v1',
      paymentId,
      actorId,
      amountCentavos,
      reason,
      cashReturnedConfirmed: cash,
    }),
  );

async function assertRefundClaim(
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

async function updateRefundedPayment(tx: Prisma.TransactionClient, id: string) {
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

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymongoRefundAdapter,
  ) {}

  private identity(actor: AuthenticatedUser | undefined) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (!ROLES.includes(actor.role)) {
      throw new ForbiddenException(
        'Manager or Administrator permission is required.',
      );
    }

    return actor;
  }

  private async authorize(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
  ) {
    const user = await tx.user.findUnique({
      where: { id: actor.id },
      select: {
        status: true,
        role: { select: { name: true } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Active staff authentication is required.',
      );
    }

    if (!ROLES.includes(user.role.name) || user.role.name !== actor.role) {
      throw new ForbiddenException(
        'Manager or Administrator permission is required.',
      );
    }
  }

  private async payment(tx: Prisma.TransactionClient, id: string) {
    const properties = await tx.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const payment = await tx.payment.findFirst({
      where: {
        id,
        reservation: {
          roomType: { propertyId: properties[0].id },
        },
      },
      include: {
        refunds: true,
        events: { select: paymentEvidenceSelect },
        reservation: {
          include: {
            payments: {
              include: {
                refunds: true,
                events: { select: paymentEvidenceSelect },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Record not found.');
    }

    return payment;
  }

  private async view(
    tx: Prisma.TransactionClient,
    id: string,
    alreadyRecorded: boolean,
  ) {
    const refund = await tx.refund.findUnique({
      where: { id },
    });

    if (!refund) {
      throw new NotFoundException('Record not found.');
    }

    const payment = await this.payment(tx, refund.paymentId);

    return {
      reservationNumber: payment.reservation.reservationNumber,
      reservationStatus: payment.reservation.status,
      paymentStatus: payment.status,
      refund: {
        id: refund.id,
        paymentId: refund.paymentId,
        status: refund.status,
        amountCentavos: refund.amountCentavos,
        currency: 'PHP',
        reason: refund.reason,
        requestedAt: refund.requestedAt,
        completedAt: refund.completedAt,
      },
      summary: calculatePaymentSummary(
        payment.reservation.totalAmountCentavos,
        payment.reservation.status,
        payment.reservation.payments,
      ),
      alreadyRecorded,
    };
  }

  private failure(error: unknown): never {
    if (error instanceof HttpException) throw error;

    this.logger.warn(
      'Refund persistence failed; use the original request identifier for status checks.',
    );

    throw new ServiceUnavailableException(
      'Refund could not be saved. Check the original request before retrying.',
    );
  }

  async forUser(
    id: string,
    actor: AuthenticatedUser | undefined,
    alreadyRecorded = true,
  ) {
    const user = this.identity(actor);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.authorize(tx, user);
        return this.view(tx, id, alreadyRecorded);
      });
    } catch (error) {
      return this.failure(error);
    }
  }

  private async reserve(
    paymentId: string,
    input: CreateRefundDto,
    actor: AuthenticatedUser,
  ) {
    const id = `rfd_${hash(`refund:${input.requestId.toLowerCase()}`)}`;

    return withInventoryWrite(this.prisma, async (tx) => {
      await this.authorize(tx, actor);

      const payment = await this.payment(tx, paymentId);
      const cash = payment.method === 'PAY_AT_PROPERTY';

      if (
        (cash && input.cashReturnedConfirmed !== true) ||
        (!cash && input.cashReturnedConfirmed !== undefined)
      ) {
        throw new BadRequestException(
          'Confirm returned money only for a Pay at Property refund.',
        );
      }

      const expected = fingerprint(
        payment.id,
        actor.id,
        input.amountCentavos,
        input.reason,
        cash,
      );

      const existing = await tx.refund.findUnique({
        where: { id },
      });

      if (existing) {
        if (
          existing.paymentId !== payment.id ||
          existing.processedByUserId !== actor.id ||
          existing.amountCentavos !== input.amountCentavos ||
          existing.reason !== input.reason
        ) {
          throw new ConflictException(
            'This request identifier belongs to different refund details.',
          );
        }

        await assertRefundClaim(tx, existing, expected);

        return {
          kind: 'stored' as const,
          id,
          alreadyRecorded: true,
        };
      }

      if (
        !['CONFIRMED', 'CANCELLED', 'EXPIRED', 'CHECKED_OUT'].includes(
          payment.reservation.status,
        )
      ) {
        throw new ConflictException(
          'New refunds are not allowed during checked-in or pending stays.',
        );
      }

      if (
        !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(payment.status) ||
        payment.reservation.payments.some(
          (receipt) =>
            receipt.status === 'PENDING' || hasPaymentReview(receipt),
        ) ||
        (cash &&
          (payment.provider ||
            payment.providerCheckoutId ||
            payment.providerPaymentId ||
            payment.checkoutRequestKeyHash ||
            payment.checkoutRequestFingerprint ||
            payment.checkoutState ||
            payment.checkoutUrl)) ||
        (!cash && !hasVerifiedPaymongoEvidence(payment))
      ) {
        throw new ConflictException(
          'Payment evidence requires review before a refund.',
        );
      }

      // Validate the whole ledger before any refund write,
      // without treating a closed booking as a new debt.
      calculatePaymentSummary(
        payment.reservation.totalAmountCentavos,
        payment.reservation.status,
        payment.reservation.payments,
      );

      const summary = calculatePaymentSummary(
        payment.amountCentavos,
        'CONFIRMED',
        [payment],
      );

      if (summary.requiresReview || summary.pendingRefundCentavos > 0) {
        throw new ConflictException('An existing refund requires review.');
      }

      const available =
        payment.amountCentavos -
        summary.refundedCentavos -
        summary.pendingRefundCentavos;

      if (input.amountCentavos > available) {
        throw new ConflictException(
          'The refund exceeds the remaining refundable amount.',
        );
      }

      if (!cash && input.amountCentavos < 100) {
        throw new BadRequestException(
          'PayMongo refunds require at least 100 centavos.',
        );
      }

      const secret = cash ? null : this.provider.secret();

      const refund = await tx.refund.create({
        data: {
          id,
          paymentId: payment.id,
          amountCentavos: input.amountCentavos,
          reason: input.reason,
          processedByUserId: actor.id,
          status: cash ? 'COMPLETED' : 'PENDING',
          completedAt: cash ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: CLAIM,
          entityType: 'Refund',
          entityId: id,
          detailsJson: JSON.stringify({
            version: 1,
            requestFingerprint: expected,
          }),
        },
      });

      if (cash) {
        await updateRefundedPayment(tx, payment.id);

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'payment.refund.completed',
            entityType: 'Refund',
            entityId: id,
            detailsJson: JSON.stringify({
              version: 1,
              source: 'pay_at_property',
            }),
          },
        });

        return {
          kind: 'stored' as const,
          id,
          alreadyRecorded: false,
        };
      }

      return {
        kind: 'online' as const,
        id: refund.id,
        secret: secret!,
        input: {
          refundId: id,
          paymentId: payment.providerPaymentId!,
          amountCentavos: input.amountCentavos,
          reason: input.reason,
        },
      };
    });
  }

  private async apply(id: string, outcome: ProviderRefund) {
    return withInventoryWrite(this.prisma, async (tx) => {
      if ((await settlePaymongoRefund(tx, id, outcome)) === 'REVIEW_REQUIRED') {
        throw new ConflictException(
          'Provider refund evidence requires review.',
        );
      }
    });
  }

  async create(
    paymentId: string,
    input: CreateRefundDto,
    actor: AuthenticatedUser | undefined,
  ) {
    const user = this.identity(actor);

    if (
      !input ||
      !isUUID(input.requestId, '4') ||
      !Number.isSafeInteger(input.amountCentavos) ||
      input.amountCentavos < 1 ||
      input.amountCentavos > 2_147_483_647 ||
      !REFUND_REASONS.includes(input.reason) ||
      (input.cashReturnedConfirmed !== undefined &&
        typeof input.cashReturnedConfirmed !== 'boolean')
    ) {
      throw new BadRequestException(
        'Provide a UUID v4, valid integer centavos, an allowed reason and valid confirmation.',
      );
    }

    try {
      const claim = await this.reserve(paymentId, input, user);

      if (claim.kind === 'stored') {
        return await this.forUser(claim.id, user, claim.alreadyRecorded);
      }

      let outcome: ProviderRefund;

      try {
        outcome = await this.provider.create(claim.input, claim.secret);
      } catch {
        // Never repeat provider creation after an uncertain result,
        // including after its idempotency window expires.
        await withInventoryWrite(this.prisma, (tx) =>
          tx.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'payment.refund.uncertain',
              entityType: 'Refund',
              entityId: claim.id,
              detailsJson: JSON.stringify({
                version: 1,
                reasonCode: 'PROVIDER_RESULT_UNCERTAIN',
              }),
            },
          }),
        );

        return await this.forUser(claim.id, user, false);
      }

      await this.apply(claim.id, outcome);

      return await this.forUser(claim.id, user, false);
    } catch (error) {
      return this.failure(error);
    }
  }
}