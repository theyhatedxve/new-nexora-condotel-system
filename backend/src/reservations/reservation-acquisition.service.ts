import { HOLD_DURATION_MS, type AcquisitionPolicy } from './reservation-acquisition-policy.js';
import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';

import { validateSync } from 'class-validator';

import type { Prisma } from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';

import { todayInPhilippines } from '../common/validation/philippine-date-range.js';

import { CreateReservationDto } from './dto/create-reservation.dto.js';

import { ReservationValidationService } from './reservation-validation.service.js';

import { assertAllocatable, connectedStays, type Stay } from './room-allocation.js';

import { expirePendingHoldsInTx } from './reservation-lifecycle.js';

import { withInventoryWrite } from './inventory-write.js';

import { UNPAID_CANCELLATION_POLICY } from './cancellation-policy.js';

@Injectable()
export class ReservationAcquisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation:
      ReservationValidationService,
  ) {}

  private validatedInput(
    input: CreateReservationDto,
    policy: AcquisitionPolicy,
  ) {
    const dto = plainToInstance(
      CreateReservationDto,
      input,
    );

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(
        'Invalid reservation details.',
      );
    }

    if (
      !dto.firstName.trim() ||
      !dto.lastName.trim()
    ) {
      throw new BadRequestException(
        'Guest names cannot be blank.',
      );
    }

    if (
      policy !== 'HOLD' &&
      policy !== 'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Unknown reservation policy.',
      );
    }

    return dto;
  }

  acquire(
    input: CreateReservationDto,
    policy: AcquisitionPolicy,
  ) {
    const dto = this.validatedInput(
      input,
      policy,
    );

    return withInventoryWrite(
      this.prisma,
      (tx) =>
        this.createInTx(
          tx,
          dto,
          policy,
          new Date(),
        ),
    );
  }

  acquireInTx(
    tx: Prisma.TransactionClient,
    input: CreateReservationDto,
    policy: AcquisitionPolicy,
    now: Date,
    trustedGuestId?: string,
  ) {
    const dto = this.validatedInput(
      input,
      policy,
    );

    return this.createInTx(
      tx,
      dto,
      policy,
      now,
      trustedGuestId,
    );
  }

  private async createInTx(
    tx: Prisma.TransactionClient,
    dto: CreateReservationDto,
    policy: AcquisitionPolicy,
    now: Date,
    trustedGuestId?: string,
  ) {
    if (!Number.isFinite(now.getTime())) {
      throw new BadRequestException(
        'Invalid acquisition time.',
      );
    }

    const stay =
      await this.validation.validate(dto, tx);

    const type =
      await tx.roomType.findUniqueOrThrow({
        where: {
          id: stay.roomTypeId,
        },
      });

    const total =
      type.baseRateCentavos * stay.nights;

    if (
      !Number.isSafeInteger(total) ||
      total > 2_147_483_647
    ) {
      throw new BadRequestException(
        'Stay total exceeds the supported amount.',
      );
    }

    await expirePendingHoldsInTx(tx, {
      propertyId: stay.propertyId,
      roomTypeId: stay.roomTypeId,
      now,
    });

    const rooms = await tx.room.findMany({
      where: {
        roomTypeId: stay.roomTypeId,
        isActive: true,
        status: {
          notIn: [
            'MAINTENANCE',
            'OUT_OF_SERVICE',
          ],
        },
      },
      include: {
        roomBlocks: {
          where: {
            canceledAt: null,
          },
        },
      },
    });

    const reservations =
      await tx.reservation.findMany({
        where: {
          OR: [
            {
              roomTypeId: stay.roomTypeId,
            },
            {
              roomAssignments: {
                some: {
                  releasedAt: null,
                  room: {
                    roomTypeId: stay.roomTypeId,
                  },
                },
              },
            },
          ],
          AND: [
            {
              OR: [
                {
                  status: {
                    in: [
                      'CONFIRMED',
                      'CHECKED_IN',
                    ],
                  },
                },
                {
                  status: 'PENDING',
                  OR: [
                    {
                      holdExpiresAt: null,
                    },
                    {
                      holdExpiresAt: {
                        gt: now,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        include: {
          roomAssignments: {
            where: {
              releasedAt: null,
            },
          },
        },
      });

    const requested: Stay = {
      id: 'new',
      start: stay.checkInDate,
      end: stay.checkOutDate,
      roomIds: [],
      readyOnly:
        stay.checkInDate.getTime() ===
        todayInPhilippines().getTime(),
    };

    const existing: Stay[] =
      reservations.map((row) => ({
        id: row.id,
        start: row.checkInDate,
        end: row.checkOutDate,
        roomIds: row.roomAssignments.map(
          (assignment) => assignment.roomId,
        ),
      }));

    assertAllocatable(
      rooms.map((room) => ({
        ...room,
        blocks: room.roomBlocks,
      })),
      connectedStays(requested, existing),
    );

    const result =
      await tx.reservation.create({
        data: {
          reservationNumber:
            `NX-${randomUUID()}`,

          guest: trustedGuestId ? {
            connect: { id: trustedGuestId },
          } : {
            create: {
              firstName:
                dto.firstName.trim(),
              lastName:
                dto.lastName.trim(),
              email: dto.email
                .trim()
                .toLowerCase(),
              phone: dto.phone?.trim(),
            },
          },

          roomType: {
            connect: {
              id: stay.roomTypeId,
            },
          },

          checkInDate: stay.checkInDate,
          checkOutDate: stay.checkOutDate,
          guestCount: stay.guestCount,

          nightlyRateCentavos:
            type.baseRateCentavos,
          totalAmountCentavos: total,

          status:
            policy === 'HOLD'
              ? 'PENDING'
              : 'CONFIRMED',

          holdExpiresAt:
            policy === 'HOLD'
              ? new Date(
                  now.getTime() +
                    HOLD_DURATION_MS,
                )
              : null,
        },

        select: {
          id: true,
          reservationNumber: true,
          status: true,
          holdExpiresAt: true,
          nightlyRateCentavos: true,
          totalAmountCentavos: true,
        },
      });

    await tx.auditLog.create({
      data: {
        actorUserId: null,
        action:
          'reservation.cancellation_policy_recorded',
        entityType: 'Reservation',
        entityId: result.id,
        detailsJson: JSON.stringify(
          UNPAID_CANCELLATION_POLICY,
        ),
      },
    });

    return result;
  }
}
export { HOLD_DURATION_MS } from './reservation-acquisition-policy.js';
