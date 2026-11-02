import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
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

import {
  parsePhilippineDate,
} from '../common/validation/philippine-date-range.js';

import {
  STAFF_RESERVATION_STATUSES,
  StaffReservationsQueryDto,
} from './dto/staff-reservations-query.dto.js';



const roles = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;


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

  list(
    actor: AuthenticatedUser | undefined,
    query: StaffReservationsQueryDto =
      new StaffReservationsQueryDto(),
  ) {
    this.assertStaff(actor);

    const requestedPage = query.page ?? 1;
    const limit = query.limit ?? 50;

    if (
      !Number.isSafeInteger(requestedPage) ||
      requestedPage < 1 ||
      requestedPage > 10000 ||
      ![20, 50].includes(limit)
    ) {
      throw new BadRequestException(
        'Invalid reservation pagination.',
      );
    }

    if (
      query.q !== undefined &&
      (
        typeof query.q !== 'string' ||
        query.q.trim().length > 100
      )
    ) {
      throw new BadRequestException(
        'Booking reference search must contain at most 100 characters.',
      );
    }

    if (
      query.status !== undefined &&
      !STAFF_RESERVATION_STATUSES.includes(query.status)
    ) {
      throw new BadRequestException(
        'Invalid reservation status.',
      );
    }

    const q = query.q?.trim() ?? '';

    const from = query.checkInFrom === undefined
      ? undefined
      : parsePhilippineDate(query.checkInFrom);

    const to = query.checkInTo === undefined
      ? undefined
      : parsePhilippineDate(query.checkInTo);

    if (from && to && from > to) {
      throw new BadRequestException(
        'Check-in end date must be on or after its start date.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);

      const where: Prisma.ReservationWhereInput = {
        roomType: { propertyId },

        ...(q
          ? {
              reservationNumber: {
                contains: q,
              },
            }
          : {}),

        ...(query.status
          ? { status: query.status }
          : {}),

        ...(from || to
          ? {
              checkInDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      };

      const total = await tx.reservation.count({
        where,
      });

      const totalPages = Math.ceil(total / limit);

      const page = total === 0
        ? 1
        : Math.min(requestedPage, totalPages);

      const items = await tx.reservation.findMany({
        where,
        select: fields,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
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