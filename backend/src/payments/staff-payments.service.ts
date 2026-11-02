import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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

import {
  paymentEvidenceSelect,
} from './payment-evidence.js';

const roles = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;

const limit = 50;

const financialFields = {
  id: true,
  method: true,
  status: true,
  amountCentavos: true,
  currency: true,
  paidAt: true,
  provider: true,
  providerCheckoutId: true,
  providerPaymentId: true,
  events: {
    select: paymentEvidenceSelect,
  },
  refunds: {
    select: {
      amountCentavos: true,
      status: true,
    },
  },
} as const;

const fields = {
  ...financialFields,
  createdAt: true,
  updatedAt: true,
  reservation: {
    select: {
      id: true,
      reservationNumber: true,
      status: true,
      totalAmountCentavos: true,
    },
  },
} as const;

type StaffPayment = Prisma.PaymentGetPayload<{
  select: typeof fields;
}>;

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

  private project(payment: StaffPayment) {
    let collection: {
      collectedCentavos: number;
      refundedCentavos: number;
      pendingRefundCentavos: number;
      netPaidCentavos: number;
    } | null = null;

    let verification:
      | 'VERIFIED_COLLECTION'
      | 'NOT_COLLECTED'
      | 'REVIEW_REQUIRED' = 'REVIEW_REQUIRED';

    try {
      if (
        payment.currency !== 'PHP' ||
        !Number.isSafeInteger(payment.amountCentavos) ||
        payment.amountCentavos <= 0
      ) {
        throw new ConflictException(
          'Payment records require financial review.',
        );
      }

      // Calculate this receipt independently of booking eligibility.
      // Booking-level obligations are calculated separately in detail().
      const receipt = calculatePaymentSummary(
        payment.amountCentavos,
        'CONFIRMED',
        [payment],
      );

      const closedWithoutStay = [
        'CANCELLED',
        'EXPIRED',
      ].includes(payment.reservation.status);

      if (!receipt.requiresReview && !closedWithoutStay) {
        verification = receipt.collectedCentavos > 0
          ? 'VERIFIED_COLLECTION'
          : 'NOT_COLLECTED';

        collection = {
          collectedCentavos: receipt.collectedCentavos,
          refundedCentavos: receipt.refundedCentavos,
          pendingRefundCentavos:
            receipt.pendingRefundCentavos,
          netPaidCentavos: receipt.netPaidCentavos,
        };
      }
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }
    }

    return {
      id: payment.id,
      method: payment.method,
      status: payment.status,
      amountCentavos: payment.amountCentavos,
      currency: payment.currency,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      verification,
      requiresReview: verification === 'REVIEW_REQUIRED',
      collection,
      reservation: {
        id: payment.reservation.id,
        reservationNumber:
          payment.reservation.reservationNumber,
        status: payment.reservation.status,
      },
    };
  }

  list(actor: AuthenticatedUser | undefined) {
    this.assertStaff(actor);

    return this.prisma.$transaction(async (tx) => {
      const propertyId = await this.propertyId(tx);

      const where = {
        reservation: {
          roomType: { propertyId },
        },
      };

      const total = await tx.payment.count({ where });

      const payments = await tx.payment.findMany({
        where,
        select: fields,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

      return {
        items: payments.map((payment) =>
          this.project(payment),
        ),
        total,
        limit,
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
        ...this.project(payment),
        bookingSummary,
        bookingRequiresReview:
          bookingSummary === null ||
          bookingSummary.requiresReview,
      };
    });
  }
}