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

const fields = {
  id: true,
  reservationNumber: true,
  status: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  createdAt: true,
  roomType: {
    select: {
      id: true,
      name: true,
    },
  },
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

@Injectable()
export class StaffReservationsService {
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
      const where = { roomType: { propertyId } };

      const total = await tx.reservation.count({
        where,
      });

      const items = await tx.reservation.findMany({
        where,
        select: fields,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

      return { items, total, limit };
    });
  }

  detail(
    id: string,
    actor: AuthenticatedUser | undefined,
  ) {
    this.assertStaff(actor);

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);

      await this.ownership.assertReservationAccess(
        actor,
        id,
        roles,
        tx,
      );

      const booking = await tx.reservation.findFirst({
        where: {
          id,
          roomType: { propertyId },
        },
        select: {
          ...fields,
          nightlyRateCentavos: true,
          totalAmountCentavos: true,
          holdExpiresAt: true,
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException(
          'Record not found.',
        );
      }

      return booking;
    });
  }
}