import {
  json,
  reconciliationOperation,
  replayReconciliation,
  completeReconciliation,
  holdReconciliation,
  reconciliationFailure,
  clearRefundReviews,
} from './reconciliation-evidence.js';
import {
  reconciliationQueueFilters,
  reconciliationPageInfo,
  readReconciliationQueueRows,
} from './reconciliation-queue.js';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import type {
  ReconcilePaymentDto,
  ReconcileRefundDto,
  ReconciliationListDto,
  ReconciliationPagesDto,
  ReconciliationStatusQueryDto,
} from './dto/reconciliation.dto.js';
import { REFUND_REASONS } from './dto/create-refund.dto.js';
import { CHECKOUT_PAID_EVENT } from './paymongo-webhook.payload.js';
import { PaymongoReconciliationAdapter } from './paymongo-reconciliation.adapter.js';

import { PaymongoWebhookService } from './paymongo-webhook.service.js';
import { settlePaymongoRefund } from './refund-settlement.js';

@Injectable()
export class PaymentReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: PaymongoReconciliationAdapter,
    private readonly webhook: PaymongoWebhookService,
  ) {}

  private identity(actor: AuthenticatedUser | undefined) {
    if (!actor?.id) throw new UnauthorizedException('Authentication required.');
    if (!['ADMIN', 'MANAGER'].includes(actor.role))
      throw new ForbiddenException(
        'Manager or Administrator permission is required.',
      );
    return actor;
  }

  private async authorize(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
  ) {
    const user = await tx.user.findUnique({
      where: { id: actor.id },
      select: { status: true, role: { select: { name: true } } },
    });
    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException(
        'Active staff authentication is required.',
      );
    if (
      user.role.name !== actor.role ||
      !['ADMIN', 'MANAGER'].includes(user.role.name)
    ) {
      throw new ForbiddenException(
        'Manager or Administrator permission is required.',
      );
    }
    const properties = await tx.property.findMany({
      select: { id: true },
      take: 2,
    });
    if (properties.length !== 1)
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    return properties[0].id;
  }

  async requestStatus(
    requestId: string,
    input: ReconciliationStatusQueryDto,
    identity: AuthenticatedUser | undefined,
  ) {
    const actor = this.identity(identity);

    if (
      !input ||
      !['payment', 'refund'].includes(input.kind) ||
      typeof input.targetId !== 'string' ||
      input.targetId.length < 1 ||
      input.targetId.length > 100
    ) {
      throw new BadRequestException(
        'Invalid reconciliation status input.',
      );
    }

    if (input.kind === 'payment') {
      if (
        typeof input.eventId !== 'string' ||
        !/^evt_[A-Za-z0-9_]{1,96}$/.test(input.eventId) ||
        input.providerRefundId !== undefined ||
        (
          input.acknowledgeLateCapture !== undefined &&
          input.acknowledgeLateCapture !== 'true' &&
          input.acknowledgeLateCapture !== 'false'
        )
      ) {
        throw new BadRequestException(
          'Provide the original payment reconciliation inputs.',
        );
      }
    } else if (
      input.eventId !== undefined ||
      input.acknowledgeLateCapture !== undefined ||
      (
        input.providerRefundId !== undefined &&
        !/^ref_[A-Za-z0-9_]{1,96}$/.test(
          input.providerRefundId,
        )
      )
    ) {
      throw new BadRequestException(
        'Provide the original refund reconciliation inputs.',
      );
    }

    const fields = input.kind === 'payment'
      ? {
          eventId: input.eventId,
          acknowledgeLateCapture:
            input.acknowledgeLateCapture === 'true',
        }
      : {
          providerRefundId:
            input.providerRefundId ?? null,
        };

    const op = reconciliationOperation(
      input.kind,
      input.targetId,
      requestId,
      actor.id,
      fields,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const propertyId = await this.authorize(tx, actor);

        const target = input.kind === 'payment'
          ? await tx.payment.findFirst({
              where: {
                id: input.targetId,
                method: 'PAYMONGO',
                provider: 'PAYMONGO',
                reservation: {
                  roomType: { propertyId },
                },
              },
              select: { id: true },
            })
          : await tx.refund.findFirst({
              where: {
                id: input.targetId,
                payment: {
                  method: 'PAYMONGO',
                  provider: 'PAYMONGO',
                  reservation: {
                    roomType: { propertyId },
                  },
                },
              },
              select: { id: true },
            });

        if (!target) {
          throw new NotFoundException('Record not found.');
        }

        const saved = await tx.auditLog.findUnique({
          where: { id: op.key },
          select: {
            actorUserId: true,
            entityType: true,
          },
        });

        if (!saved || saved.actorUserId !== actor.id) {
          throw new NotFoundException(
            'No completed reconciliation result was found.',
          );
        }

        if (saved.entityType !== 'PaymentReconciliation') {
          throw new ConflictException(
            'Reconciliation evidence requires review.',
          );
        }

        const result = await replayReconciliation(tx, op);

        if (!result) {
          throw new NotFoundException(
            'No completed reconciliation result was found.',
          );
        }

        return {
          requestId: requestId.toLowerCase(),
          kind: input.kind,
          ...result,
        };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new ServiceUnavailableException(
        'Reconciliation status could not be read.',
      );
    }
  }

    async list(
      query: ReconciliationListDto,
      identity: AuthenticatedUser | undefined,
    ) {
      const actor = this.identity(identity);

      if (
        !Number.isInteger(query.offset) ||
        query.offset < 0 ||
        query.offset > 10000 ||
        !Number.isInteger(query.limit) ||
        query.limit < 1 ||
        query.limit > 50
      ) {
        throw new BadRequestException('Invalid pagination.');
      }

      try {
        return await this.prisma.$transaction(async (tx) => {
          const propertyId = await this.authorize(tx, actor);
          const filters = reconciliationQueueFilters(propertyId);

          const rows = await readReconciliationQueueRows(
            tx,
            filters,
            {
              payments: query.offset,
              refunds: query.offset,
              events: query.offset,
            },
            query.limit,
          );

          return {
            ...rows,
            offset: query.offset,
            limit: query.limit,
          };
        });
      } catch (error) {
        return reconciliationFailure(error);
      }
    }

    async pages(
      query: ReconciliationPagesDto,
      identity: AuthenticatedUser | undefined,
    ) {
      const actor = this.identity(identity);

      const requestedPages = [
        query.paymentPage,
        query.refundPage,
        query.eventPage,
      ];

      if (
        !requestedPages.every(
          (page) =>
            Number.isSafeInteger(page) &&
            page >= 1 &&
            page <= 10000,
        ) ||
        ![20, 50].includes(query.limit)
      ) {
        throw new BadRequestException(
          'Invalid reconciliation queue pagination.',
        );
      }

      try {
        return await this.prisma.$transaction(async (tx) => {
          const propertyId = await this.authorize(tx, actor);
          const filters = reconciliationQueueFilters(propertyId);

          const paymentTotal = await tx.payment.count({
            where: filters.payments,
          });

          const refundTotal = await tx.refund.count({
            where: filters.refunds,
          });

          const eventTotal = await tx.paymentEvent.count({
            where: filters.events,
          });

          const pagination = {
            payments: reconciliationPageInfo(
              paymentTotal,
              query.paymentPage,
              query.limit,
            ),
            refunds: reconciliationPageInfo(
              refundTotal,
              query.refundPage,
              query.limit,
            ),
            events: reconciliationPageInfo(
              eventTotal,
              query.eventPage,
              query.limit,
            ),
          };

          const rows = await readReconciliationQueueRows(
            tx,
            filters,
            {
              payments:
                (pagination.payments.page - 1) * query.limit,
              refunds:
                (pagination.refunds.page - 1) * query.limit,
              events:
                (pagination.events.page - 1) * query.limit,
            },
            query.limit,
          );

          return {
            ...rows,
            limit: query.limit,
            pagination,
          };
        });
      } catch (error) {
        if (error instanceof HttpException) throw error;

        throw new ServiceUnavailableException(
          'Reconciliation queues could not be read.',
        );
      }
    }

  async payment(
    id: string,
    input: ReconcilePaymentDto,
    identity: AuthenticatedUser | undefined,
  ) {
    const actor = this.identity(identity);
    const op = reconciliationOperation('payment', id, input.requestId, actor.id, {
      eventId: input.eventId,
      acknowledgeLateCapture: input.acknowledgeLateCapture === true,
    });
    if (
      !/^evt_[A-Za-z0-9_]{1,96}$/.test(input.eventId) ||
      (input.acknowledgeLateCapture !== undefined &&
        typeof input.acknowledgeLateCapture !== 'boolean')
    ) {
      throw new BadRequestException('Invalid reconciliation input.');
    }
    try {
      const before = await this.prisma.$transaction(async (tx) => {
        const propertyId = await this.authorize(tx, actor);
        const replay = await replayReconciliation(tx, op);
        if (replay) return { replay, providerId: null };
        const payment = await tx.payment.findFirst({
          where: {
            id,
            method: 'PAYMONGO',
            provider: 'PAYMONGO',
            reservation: { roomType: { propertyId } },
          },
          select: { id: true },
        });
        if (!payment) throw new NotFoundException('Record not found.');
        const event = await tx.paymentEvent.findUnique({
          where: { providerEventId: input.eventId },
        });
        const proof = json(event?.payloadJson);
        const providerId =
          event?.paymentId === id &&
          event.signatureVerified &&
          event.eventType === CHECKOUT_PAID_EVENT &&
          proof?.version === 1 &&
          proof.livemode === false &&
          typeof proof.providerPaymentId === 'string'
            ? proof.providerPaymentId
            : null;
        return { replay: null, providerId };
      });
      if (before.replay) return before.replay;
      const remote = before.providerId
        ? await this.provider.payment(before.providerId)
        : null;
      return await withInventoryWrite(this.prisma, async (tx) => {
        await this.authorize(tx, actor);
        const replay = await replayReconciliation(tx, op);
        if (replay) return replay;
        const outcome = remote
          ? await this.webhook.reconcileInTransaction(
              tx,
              id,
              input.eventId,
              remote,
              input.acknowledgeLateCapture === true,
              actor.id,
            )
          : 'REVIEW_REQUIRED';
        return completeReconciliation(tx, op, actor.id, outcome);
      });
    } catch (error) {
      return reconciliationFailure(error);
    }
  }

  async refund(
    id: string,
    input: ReconcileRefundDto,
    identity: AuthenticatedUser | undefined,
  ) {
    const actor = this.identity(identity);
    const op = reconciliationOperation('refund', id, input.requestId, actor.id, {
      providerRefundId: input.providerRefundId ?? null,
    });
    if (
      input.providerRefundId !== undefined &&
      !/^ref_[A-Za-z0-9_]{1,96}$/.test(input.providerRefundId)
    ) {
      throw new BadRequestException('Invalid provider refund reference.');
    }
    try {
      const before = await this.prisma.$transaction(async (tx) => {
        const propertyId = await this.authorize(tx, actor);
        const replay = await replayReconciliation(tx, op);
        if (replay) return { replay, refund: null };
        const refund = await tx.refund.findFirst({
          where: {
            id,
            payment: {
              method: 'PAYMONGO',
              provider: 'PAYMONGO',
              reservation: { roomType: { propertyId } },
            },
          },
          include: { payment: { select: { providerPaymentId: true } } },
        });
        if (!refund) throw new NotFoundException('Record not found.');
        if (
          refund.providerRefundId &&
          input.providerRefundId &&
          refund.providerRefundId !== input.providerRefundId
        ) {
          throw new ConflictException(
            'Provider reference does not match this refund.',
          );
        }
        return { replay: null, refund };
      });
      if (before.replay) return before.replay;
      const refund = before.refund!;
      const reason = REFUND_REASONS.find((value) => value === refund.reason);
      if (!reason || !refund.payment.providerPaymentId)
        throw new ConflictException('Refund evidence requires review.');
      const providerId = refund.providerRefundId ?? input.providerRefundId;
      const outcome = providerId
        ? await this.provider.refund(providerId, {
            refundId: id,
            paymentId: refund.payment.providerPaymentId,
            amountCentavos: refund.amountCentavos,
            reason,
          })
        : null;
      return await withInventoryWrite(this.prisma, async (tx) => {
        await this.authorize(tx, actor);
        const replay = await replayReconciliation(tx, op);
        if (replay) return replay;
        if (!outcome)
          return completeReconciliation(tx, op, actor.id, 'PROVIDER_REFERENCE_REQUIRED');
        const current = await tx.refund.findUniqueOrThrow({ where: { id } });
        if (current.reason !== reason)
          throw new ConflictException(
            'Refund request changed during reconciliation.',
          );
        const result = await settlePaymongoRefund(tx, id, outcome);
        if (result === 'REVIEW_REQUIRED')
          await holdReconciliation(tx, refund.paymentId, op);
        else await clearRefundReviews(tx, outcome, reason, actor.id);
        return completeReconciliation(tx, op, actor.id, result);
      });
    } catch (error) {
      return reconciliationFailure(error);
    }
  }
}
