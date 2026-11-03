import { createHash } from 'node:crypto';
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
import { isUUID } from 'class-validator';
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
import {
  CHECKOUT_PAID_EVENT,
  object,
  REFUND_EVENTS,
} from './paymongo-webhook.payload.js';
import { PaymongoReconciliationAdapter } from './paymongo-reconciliation.adapter.js';
import type { ProviderRefund } from './paymongo-refund.adapter.js';
import { PaymongoWebhookService } from './paymongo-webhook.service.js';
import { settlePaymongoRefund } from './refunds.service.js';

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

type Outcome =
  | 'IGNORED'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'REVIEW_REQUIRED'
  | 'PROVIDER_REFERENCE_REQUIRED';

type Operation = { key: string; fingerprint: string; target: string };

function json(value: string | null | undefined) {
  try {
    return object(JSON.parse(value ?? 'null'));
  } catch {
    return null;
  }
}

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

  private operation(
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

  private async replay(tx: Prisma.TransactionClient, op: Operation) {
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

  private async done(
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

  private async hold(
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

  private failure(error: unknown): never {
    if (error instanceof HttpException) throw error;
    throw new ServiceUnavailableException(
      'Reconciliation could not be saved. Retry with the same request identifier.',
    );
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

    const op = this.operation(
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

        const result = await this.replay(tx, op);

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

  private queueFilters(propertyId: string) {
      const scope: Prisma.PaymentWhereInput = {
        reservation: {
          roomType: { propertyId },
        },
      };

      const payments: Prisma.PaymentWhereInput = {
        ...scope,
        method: 'PAYMONGO',
        provider: 'PAYMONGO',
        OR: [
          {
            status: 'PENDING',
            checkoutState: {
              in: ['CREATING', 'UNKNOWN'],
            },
          },
          {
            events: {
              some: {
                OR: [
                  { status: 'FAILED' },
                  { errorMessage: { not: null } },
                ],
              },
            },
          },
        ],
      };

      const refunds: Prisma.RefundWhereInput = {
        status: 'PENDING',
        payment: {
          ...scope,
          method: 'PAYMONGO',
          provider: 'PAYMONGO',
        },
      };

      const events: Prisma.PaymentEventWhereInput = {
        AND: [
          {
            OR: [
              { paymentId: null },
              { payment: scope },
            ],
          },
          {
            OR: [
              { status: 'FAILED' },
              { errorMessage: { not: null } },
              {
                status: 'IGNORED',
                eventType: { in: REFUND_EVENTS },
              },
            ],
          },
        ],
      };

      return { payments, refunds, events };
    }

    private pageInfo(
      total: number,
      requestedPage: number,
      limit: number,
    ) {
      const totalPages = Math.ceil(total / limit);

      return {
        total,
        page: total === 0
          ? 1
          : Math.min(requestedPage, totalPages),
        limit,
        totalPages,
      };
    }

    private async readQueueRows(
      tx: Prisma.TransactionClient,
      filters: {
        payments: Prisma.PaymentWhereInput;
        refunds: Prisma.RefundWhereInput;
        events: Prisma.PaymentEventWhereInput;
      },
      offsets: {
        payments: number;
        refunds: number;
        events: number;
      },
      limit: number,
    ) {
      const payments = await tx.payment.findMany({
        where: filters.payments,
        skip: offsets.payments,
        take: limit,
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          reservationId: true,
          status: true,
          checkoutState: true,
          amountCentavos: true,
          currency: true,
          createdAt: true,
        },
      });

      const refunds = await tx.refund.findMany({
        where: filters.refunds,
        skip: offsets.refunds,
        take: limit,
        orderBy: [
          { requestedAt: 'asc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          paymentId: true,
          providerRefundId: true,
          status: true,
          amountCentavos: true,
          requestedAt: true,
        },
      });

      const events = await tx.paymentEvent.findMany({
        where: filters.events,
        skip: offsets.events,
        take: limit,
        orderBy: [
          { createdAt: 'asc' },
          { id: 'asc' },
        ],
        select: {
          providerEventId: true,
          paymentId: true,
          eventType: true,
          status: true,
          errorMessage: true,
          createdAt: true,
        },
      });

      return { payments, refunds, events };
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
          const filters = this.queueFilters(propertyId);

          const rows = await this.readQueueRows(
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
        return this.failure(error);
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
          const filters = this.queueFilters(propertyId);

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
            payments: this.pageInfo(
              paymentTotal,
              query.paymentPage,
              query.limit,
            ),
            refunds: this.pageInfo(
              refundTotal,
              query.refundPage,
              query.limit,
            ),
            events: this.pageInfo(
              eventTotal,
              query.eventPage,
              query.limit,
            ),
          };

          const rows = await this.readQueueRows(
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
    const op = this.operation('payment', id, input.requestId, actor.id, {
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
        const replay = await this.replay(tx, op);
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
        const replay = await this.replay(tx, op);
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
        return this.done(tx, op, actor.id, outcome);
      });
    } catch (error) {
      return this.failure(error);
    }
  }

  private async clearRefundReviews(
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

  async refund(
    id: string,
    input: ReconcileRefundDto,
    identity: AuthenticatedUser | undefined,
  ) {
    const actor = this.identity(identity);
    const op = this.operation('refund', id, input.requestId, actor.id, {
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
        const replay = await this.replay(tx, op);
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
        const replay = await this.replay(tx, op);
        if (replay) return replay;
        if (!outcome)
          return this.done(tx, op, actor.id, 'PROVIDER_REFERENCE_REQUIRED');
        const current = await tx.refund.findUniqueOrThrow({ where: { id } });
        if (current.reason !== reason)
          throw new ConflictException(
            'Refund request changed during reconciliation.',
          );
        const result = await settlePaymongoRefund(tx, id, outcome);
        if (result === 'REVIEW_REQUIRED')
          await this.hold(tx, refund.paymentId, op);
        else await this.clearRefundReviews(tx, outcome, reason, actor.id);
        return this.done(tx, op, actor.id, result);
      });
    } catch (error) {
      return this.failure(error);
    }
  }
}