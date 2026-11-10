import {
  roles,
  financialFields,
  fields,
  projectStaffPayment,
} from './staff-payment-projection.js';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  OwnershipService,
  type AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import { calculatePaymentSummary } from './payment-summary.js';

import {
  STAFF_PAYMENT_METHODS,
  STAFF_PAYMENT_STATUSES,
  StaffPaymentsQueryDto,
} from './dto/staff-payments-query.dto.js';

@Injectable()
export class StaffPaymentsService {
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
    query: StaffPaymentsQueryDto =
      new StaffPaymentsQueryDto(),
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
        'Invalid payment pagination.',
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
      query.method !== undefined &&
      !STAFF_PAYMENT_METHODS.includes(query.method)
    ) {
      throw new BadRequestException(
        'Invalid payment method.',
      );
    }

    if (
      query.status !== undefined &&
      !STAFF_PAYMENT_STATUSES.includes(query.status)
    ) {
      throw new BadRequestException(
        'Invalid stored payment status.',
      );
    }

    const q = query.q?.trim() ?? '';

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);

      const where: Prisma.PaymentWhereInput = {
        reservation: {
          roomType: { propertyId },

          ...(q
            ? {
                reservationNumber: {
                  contains: q,
                },
              }
            : {}),
        },

        ...(query.method
          ? { method: query.method }
          : {}),

        ...(query.status
          ? { status: query.status }
          : {}),
      };

      const total = await tx.payment.count({
        where,
      });

      const totalPages = Math.ceil(total / limit);

      const page = total === 0
        ? 1
        : Math.min(requestedPage, totalPages);

      const payments = await tx.payment.findMany({
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
        items: payments.map((payment) =>
          projectStaffPayment(payment),
        ),
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

      const payment = await tx.payment.findFirst({
        where: {
          id,
          reservation: {
            roomType: { propertyId },
          },
        },
        select: fields,
      });

      if (!payment) {
        throw new NotFoundException(
          'Record not found.',
        );
      }

      await this.ownership.assertReservationAccess(
        actor,
        payment.reservation.id,
        roles,
        tx,
      );

      const payments = await tx.payment.findMany({
        where: {
          reservationId: payment.reservation.id,
        },
        select: financialFields,
      });

      let bookingSummary:
        | ReturnType<typeof calculatePaymentSummary>
        | null = null;

      try {
        bookingSummary = calculatePaymentSummary(
          payment.reservation.totalAmountCentavos,
          payment.reservation.status,
          payments,
        );
      } catch (error) {
        if (!(error instanceof ConflictException)) {
          throw error;
        }
      }

      return {
        ...projectStaffPayment(payment),
        bookingSummary,
        bookingRequiresReview:
          bookingSummary === null ||
          bookingSummary.requiresReview,
      };
    });
  }
}
