import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  OwnershipService,
  type AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  calculatePaymentSummary,
} from './payment-summary.js';

import { paymentEvidenceSelect } from './payment-evidence.js';

@Injectable()
export class PaymentSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership:
      OwnershipService,
  ) {}

  forUser(
    reservationId: string,
    actor: AuthenticatedUser | undefined,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.ownership
          .assertReservationAccess(
            actor,
            reservationId,
            [
              'ADMIN',
              'MANAGER',
              'RECEPTIONIST',
            ],
            tx,
          );

        return this.read(
          tx,
          {
            id: reservationId,
          },
        );
      },
    );
  }

  // Internal method only.
  // The caller must derive this number from
  // an already verified booking session.
  //
  // Never pass request body, query or route
  // values directly into this method.
  forVerifiedBookingNumber(
    reservationNumber: string,
  ) {
    return this.prisma.$transaction(
      (tx) =>
        this.read(
          tx,
          {
            reservationNumber,
          },
        ),
    );
  }

  private async read(
    tx: Prisma.TransactionClient,
    identity:
      | { id: string }
      | { reservationNumber: string },
  ) {
    const properties =
      await tx.property.findMany({
        select: {
          id: true,
        },
        take: 2,
      });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    const booking =
      await tx.reservation.findFirst({
        where: {
          ...identity,
          roomType: {
            propertyId: properties[0].id,
          },
        },
        select: {
          reservationNumber: true,
          status: true,
          totalAmountCentavos: true,
          payments: {
            include: {
              refunds: true,
              events: { select: paymentEvidenceSelect },
            },
          },
        },
      });

    if (!booking) {
      throw new NotFoundException(
        'Record not found.',
      );
    }

    return {
      reservationNumber:
        booking.reservationNumber,
      reservationStatus: booking.status,

      ...calculatePaymentSummary(
        booking.totalAmountCentavos,
        booking.status,
        booking.payments,
      ),
    };
  }
}
