import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  OwnershipService,
  type AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import type {
  Prisma,
} from '../generated/prisma/client.js';

const roles = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;

const limit = 50;
const historyLimit = 25;

@Injectable()
export class StaffGuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: OwnershipService,
  ) {}

  private assertStaff(
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (!roles.some((role) => role === actor.role)) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }
  }

  private async propertyId(
    tx: Prisma.TransactionClient,
  ) {
    const properties = await tx.property.findMany({
      select: { id: true },
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    return properties[0].id;
  }

  list(actor: AuthenticatedUser | undefined) {
    this.assertStaff(actor);

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);

      const reservationWhere = {
        roomType: { propertyId },
      };

      const where = {
        reservations: {
          some: reservationWhere,
        },
      };

      const total = await tx.guest.count({
        where,
      });

      const guests = await tx.guest.findMany({
        where,
        take: limit,
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          _count: {
            select: {
              reservations: {
                where: reservationWhere,
              },
            },
          },
        },
      });

      const items = guests.map(
        ({ _count, ...guest }) => ({
          ...guest,
          reservationCount: _count.reservations,
        }),
      );

      return { items, total, limit };
    });
  }

  async detail(
    id: string,
    actor: AuthenticatedUser | undefined,
  ) {
    this.assertStaff(actor);

    await this.ownership.assertGuestAccess(
      actor,
      id,
      roles,
    );

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);

      const reservationWhere = {
        roomType: { propertyId },
      };

      const guest = await tx.guest.findFirst({
        where: {
          id,
          reservations: {
            some: reservationWhere,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          _count: {
            select: {
              reservations: {
                where: reservationWhere,
              },
            },
          },
          reservations: {
            where: reservationWhere,
            take: historyLimit,
            orderBy: [
              { createdAt: 'desc' },
              { id: 'desc' },
            ],
            select: {
              id: true,
              reservationNumber: true,
              status: true,
              checkInDate: true,
              checkOutDate: true,
              roomType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!guest) {
        throw new NotFoundException(
          'Record not found.',
        );
      }

      const { _count, ...record } = guest;

      return {
        ...record,
        reservationCount: _count.reservations,
        historyLimit,
      };
    });
  }
}