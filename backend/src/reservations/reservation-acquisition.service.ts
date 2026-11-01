import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  todayInPhilippines,
} from '../common/validation/philippine-date-range.js';

import {
  CreateReservationDto,
} from './dto/create-reservation.dto.js';

import {
  ReservationValidationService,
} from './reservation-validation.service.js';

import {
  assertAllocatable,
  connectedStays,
  type Stay,
} from './room-allocation.js';

export const HOLD_DURATION_MS = 15 * 60 * 1000;

function retryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const value = error as {
    code?: string;
    cause?: unknown;
    meta?: unknown;
  };

  if (
    [
      'P1008',
      'P2034',
      'SQLITE_BUSY',
      'SQLITE_LOCKED',
    ].includes(value.code ?? '')
  ) {
    return true;
  }

  // The installed SQLite adapter maps SQLITE_BUSY
  // to SocketTimeout.
  if (
    JSON.stringify(value.meta ?? {})
      .includes('SocketTimeout')
  ) {
    return true;
  }

  return (
    value.cause !== error &&
    retryable(value.cause)
  );
}

@Injectable()
export class ReservationAcquisitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: ReservationValidationService,
  ) {}

  // Internal service only.
  // A future controller must select the approved policy.
  async acquire(
    input: CreateReservationDto,
    policy: 'HOLD' | 'CONFIRMED',
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

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            // SQLite-specific: obtain the database
            // write lock BEFORE performing any reads.
            //
            // No property values change.
            await tx.$executeRaw`
              UPDATE "Property"
              SET "id" = "id"
            `;

            const now = new Date();

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

            // Expiration is part of this transaction.
            // A later failure also rolls this update back.
            await tx.reservation.updateMany({
              where: {
                roomTypeId: stay.roomTypeId,
                status: 'PENDING',
                holdExpiresAt: {
                  lte: now,
                },
              },
              data: {
                status: 'EXPIRED',
              },
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

            // The guest and reservation commit together.
            // No payment or room assignment is created.
            return tx.reservation.create({
              data: {
                reservationNumber:
                  `NX-${randomUUID()}`,

                guest: {
                  create: {
                    firstName: dto.firstName.trim(),
                    lastName: dto.lastName.trim(),
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
          },
          {
            maxWait: 1000,
            timeout: 10_000,
          },
        );
      } catch (error) {
        if (!retryable(error)) {
          throw error;
        }

        if (attempt === 4) {
          throw new ServiceUnavailableException(
            'Inventory is busy. Please try again.',
          );
        }

        await delay(25 * (attempt + 1));
      }
    }

    throw new ServiceUnavailableException(
      'Inventory is busy.',
    );
  }
}