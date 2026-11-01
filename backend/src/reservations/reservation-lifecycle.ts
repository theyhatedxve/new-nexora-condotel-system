import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import type {
  Prisma,
  ReservationStatus,
} from '../generated/prisma/client.js';

const transitions: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELLED: [],
  EXPIRED: [],
};

// Structural rules only.
// This does not authorize an operation, verify payment,
// acquire inventory, or implement the other transitions.
export function assertReservationTransition(
  from: ReservationStatus,
  to: ReservationStatus,
): void {
  if (!transitions[from]?.includes(to)) {
    throw new ConflictException(
      `Transition from ${from} to ${to} is not permitted.`,
    );
  }
}

export const MAX_EXPIRATION_BATCH = 100;

interface ExpirationOptions {
  propertyId: string;
  now: Date;
  roomTypeId?: string;
  limit?: number;
  actorUserId?: string;
}

// The caller must hold the SQLite write lock
// and use this same transaction.
//
// Property, time and actor come from trusted backend
// code, never from public request fields.
export async function expirePendingHoldsInTx(
  tx: Prisma.TransactionClient,
  {
    propertyId,
    now,
    roomTypeId,
    limit = MAX_EXPIRATION_BATCH,
    actorUserId,
  }: ExpirationOptions,
) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_EXPIRATION_BATCH
  ) {
    throw new BadRequestException(
      `Expiration batch must be from 1 to ${MAX_EXPIRATION_BATCH}.`,
    );
  }

  if (!Number.isFinite(now.getTime())) {
    throw new BadRequestException(
      'Invalid expiration time.',
    );
  }

  const where: Prisma.ReservationWhereInput = {
    status: 'PENDING',
    holdExpiresAt: {
      lte: now,
    },
    roomType: {
      propertyId,
    },
    ...(roomTypeId ? { roomTypeId } : {}),
  };

  const holds = await tx.reservation.findMany({
    where,
    select: {
      id: true,
      holdExpiresAt: true,
    },
    orderBy: [
      { holdExpiresAt: 'asc' },
      { id: 'asc' },
    ],
    take: limit,
  });

  let expiredCount = 0;
  let releasedAssignmentCount = 0;

  for (const hold of holds) {
    assertReservationTransition(
      'PENDING',
      'EXPIRED',
    );

    const claimed =
      await tx.reservation.updateMany({
        where: {
          id: hold.id,
          status: 'PENDING',
          holdExpiresAt: {
            lte: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

    if (claimed.count !== 1) {
      continue;
    }

    const released =
      await tx.roomAssignment.updateMany({
        where: {
          reservationId: hold.id,
          releasedAt: null,
        },
        data: {
          releasedAt: now,
        },
      });

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: 'reservation.hold_expired',
        entityType: 'Reservation',
        entityId: hold.id,
        detailsJson: JSON.stringify({
          holdExpiresAt:
            hold.holdExpiresAt?.toISOString(),
          releasedAssignmentCount:
            released.count,
        }),
      },
    });

    expiredCount += 1;
    releasedAssignmentCount += released.count;
  }

  const remaining =
    await tx.reservation.findFirst({
      where,
      select: {
        id: true,
      },
    });

  return {
    expiredCount,
    releasedAssignmentCount,
    hasMore: remaining !== null,
  };
}