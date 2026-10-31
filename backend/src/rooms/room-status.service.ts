
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { todayInPhilippines } from '../common/validation/philippine-date-range.js';
import type { ManualRoomStatus } from './dto/update-room-status.dto.js';

const transitions: Record<string, readonly string[]> = {
  READY: ['CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  CLEANING: ['READY', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  MAINTENANCE: ['CLEANING', 'READY', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['MAINTENANCE', 'CLEANING', 'READY'],
  OCCUPIED: [],
};

@Injectable()
export class RoomStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    roomId: string,
    nextStatus: ManualRoomStatus,
    actorRole: string,
  ) {
    const properties = await this.prisma.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const propertyId = properties[0].id;

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({
        where: {
          id: roomId,
          roomType: { propertyId },
        },
        select: {
          id: true,
          roomNumber: true,
          status: true,
          isActive: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Room not found.');
      }

      if (!transitions[room.status]?.includes(nextStatus)) {
        throw new ConflictException(
          `Transition from ${room.status} to ${nextStatus} is not permitted.`,
        );
      }

      const isManager =
        actorRole === 'ADMIN' || actorRole === 'MANAGER';

      const isHousekeepingTransition =
        (room.status === 'READY' && nextStatus === 'CLEANING') ||
        (room.status === 'CLEANING' && nextStatus === 'READY');

      if (!isManager) {
        if (
          actorRole !== 'RECEPTIONIST' ||
          !isHousekeepingTransition
        ) {
          throw new ForbiddenException(
            'This room transition requires ADMIN or MANAGER.',
          );
        }
      }

      if (
        !room.isActive &&
        nextStatus !== 'MAINTENANCE' &&
        nextStatus !== 'OUT_OF_SERVICE'
      ) {
        throw new ConflictException(
          'Reactivate the room before making it ready.',
        );
      }

      const today = todayInPhilippines();

      // An active checked-in assignment must never be
      // displaced by an administrative status change.
      const checkedInAssignment =
        await tx.roomAssignment.findFirst({
          where: {
            roomId,
            releasedAt: null,
            reservation: {
              status: 'CHECKED_IN',
              checkOutDate: { gt: today },
            },
          },
          select: { id: true },
        });

      if (checkedInAssignment) {
        throw new ConflictException(
          'A checked-in guest is assigned to this room.',
        );
      }

      return tx.room.update({
        where: { id: roomId },
        data: { status: nextStatus },
        select: {
          id: true,
          roomNumber: true,
          status: true,
          isActive: true,
        },
      });
    });
  }
}
