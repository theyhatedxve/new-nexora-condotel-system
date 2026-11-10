import type { Prisma } from '../generated/prisma/client.js';

import { REFUND_EVENTS } from './paymongo-webhook.payload.js';

export function reconciliationQueueFilters(propertyId: string) {
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

export function reconciliationPageInfo(
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

export async function readReconciliationQueueRows(
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
