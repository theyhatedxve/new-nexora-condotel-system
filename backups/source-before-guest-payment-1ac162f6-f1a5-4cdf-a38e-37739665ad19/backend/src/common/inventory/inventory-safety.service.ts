
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';

import { PrismaService } from '../../prisma/prisma.service.js';

import { RoomRateCapacityService } from '../validation/room-rate-capacity.service.js';

import {
  parseBlockRange,
  todayInPhilippines,
} from '../validation/philippine-date-range.js';

export type InventoryCheckMode = 'IMMEDIATE' | 'FUTURE';

export interface InventoryCheckRequest {
  roomId: string;
  roomTypeId: string;
  guestCount: number;
  checkInDate: string;
  checkOutDate: string;
  mode: InventoryCheckMode;

  // Exclude only the reservation currently being assigned
  // or reassigned. Never accept this from an untrusted
  // public request without authorization.
  excludeReservationId?: string;
}

export interface InventoryCheckResult {
  eligible: true;
  roomId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  mode: InventoryCheckMode;
}

type InventoryDatabase =
  Pick<
    Prisma.TransactionClient,
    'property' | 'room' | 'roomBlock' | 'roomAssignment'
  >;

@Injectable()
export class InventorySafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateCapacity: RoomRateCapacityService,
  ) {}

  /**
   * Read-only eligibility check.
   *
   * This does not reserve a room.
   * A future assignment writer must call assertEligibleInTx()
   * in the same transaction used to create its assignment.
   */
  async assertEligible(
    request: InventoryCheckRequest,
  ): Promise<InventoryCheckResult> {
    return this.assertEligibleInTx(this.prisma, request);
  }

  /**
   * Reusable eligibility check inside an existing transaction.
   *
   * Do not perform the check in one transaction and create the
   * assignment in a different transaction.
   */
  async assertEligibleInTx(
    db: InventoryDatabase,
    request: InventoryCheckRequest,
  ): Promise<InventoryCheckResult> {
    const { startDate, endDate } = parseBlockRange(
      request.checkInDate,
      request.checkOutDate,
    );

    this.rateCapacity.validateCapacity(request.guestCount);

    if (
      request.mode !== 'IMMEDIATE' &&
      request.mode !== 'FUTURE'
    ) {
      throw new ConflictException(
        'Unknown inventory check mode.',
      );
    }

    const properties = await db.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const propertyId = properties[0].id;

    const room = await db.room.findFirst({
      where: {
        id: request.roomId,
        roomType: {
          propertyId,
        },
      },
      select: {
        id: true,
        roomTypeId: true,
        status: true,
        isActive: true,
        roomType: {
          select: {
            id: true,
            capacity: true,
            isActive: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(
        'Physical room not found in this property.',
      );
    }

    if (!room.isActive || !room.roomType.isActive) {
      throw new ConflictException(
        'The room or its room type is inactive.',
      );
    }

    if (room.roomTypeId !== request.roomTypeId) {
      throw new ConflictException(
        'Physical room type does not match the reservation.',
      );
    }

    this.rateCapacity.validateGuestCount(
      request.guestCount,
      room.roomType.capacity,
    );

    if (
      room.status === 'MAINTENANCE' ||
      room.status === 'OUT_OF_SERVICE'
    ) {
      throw new ConflictException(
        'Room is unavailable due to its operational status.',
      );
    }

    if (request.mode === 'IMMEDIATE') {
      if (room.status !== 'READY') {
        throw new ConflictException(
          'Room is not ready for immediate use.',
        );
      }

      const today = todayInPhilippines();

      if (startDate > today || endDate <= today) {
        throw new ConflictException(
          'Immediate-use dates must include today.',
        );
      }
    }

    // End-exclusive overlap:
    // existing.startDate < requested.endDate
    // AND existing.endDate > requested.startDate.
    const activeBlock = await db.roomBlock.findFirst({
      where: {
        roomId: room.id,
        canceledAt: null,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      select: { id: true },
    });

    if (activeBlock) {
      throw new ConflictException(
        'An active room block overlaps the requested dates.',
      );
    }

    const conflictingAssignment =
      await db.roomAssignment.findFirst({
        where: {
          roomId: room.id,
          releasedAt: null,
          reservation: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
            },
            checkInDate: { lt: endDate },
            checkOutDate: { gt: startDate },
            ...(request.excludeReservationId
              ? {
                  id: {
                    not: request.excludeReservationId,
                  },
                }
              : {}),
          },
        },
        select: {
          id: true,
        },
      });

    if (conflictingAssignment) {
      throw new ConflictException(
        'A protected room assignment overlaps these dates.',
      );
    }

    return {
      eligible: true,
      roomId: room.id,
      roomTypeId: room.roomTypeId,
      checkInDate: request.checkInDate,
      checkOutDate: request.checkOutDate,
      mode: request.mode,
    };
  }
}
