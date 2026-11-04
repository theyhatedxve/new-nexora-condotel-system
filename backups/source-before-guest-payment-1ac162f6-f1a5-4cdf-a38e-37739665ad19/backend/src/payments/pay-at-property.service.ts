// CREATE: backend/src/payments/pay-at-property.service.ts

import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Payment } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { todayInPhilippines } from '../common/validation/philippine-date-range.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { withInventoryWrite } from '../reservations/inventory-write.js';
import type { RecordPropertyPaymentDto } from './dto/record-property-payment.dto.js';
import {
  hasVerifiedPaymongoEvidence,
  paymentEvidenceSelect,
} from './payment-evidence.js';
import {
  calculatePaymentSummary,
  type SummaryPayment,
} from './payment-summary.js';

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
const ACTION = 'payment.pay_at_property.recorded';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class PayAtPropertyService {
  private readonly logger = new Logger(PayAtPropertyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    reservationId: string,
    input: RecordPropertyPaymentDto,
    actor: AuthenticatedUser | undefined,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (!STAFF_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Staff permission is required.');
    }

    if (
      !input ||
      !isUUID(input.requestId, '4') ||
      !Number.isSafeInteger(input.amountCentavos) ||
      input.amountCentavos < 1 ||
      input.amountCentavos > 2_147_483_647 ||
      input.collectionConfirmed !== true
    ) {
      throw new BadRequestException(
        'Provide a UUID v4 requestId, valid integer centavos and confirmation of receipt.',
      );
    }

    // The existing primary key provides durable uniqueness
    // without using checkout-link fields.
    const receiptId =
      `pap_${digest(`pay-at-property:${input.requestId.toLowerCase()}`)}`;

    const fingerprint = digest(
      JSON.stringify({
        operation: 'pay-at-property-v1',
        reservationId,
        actorId: actor.id,
        amountCentavos: input.amountCentavos,
        currency: 'PHP',
        collectionConfirmed: true,
      }),
    );

    try {
      return await withInventoryWrite(this.prisma, async (tx) => {
        const operator = await tx.user.findUnique({
          where: { id: actor.id },
          select: {
            status: true,
            role: { select: { name: true } },
          },
        });

        if (!operator || operator.status !== 'ACTIVE') {
          throw new UnauthorizedException(
            'Active staff authentication is required.',
          );
        }

        if (
          !STAFF_ROLES.includes(operator.role.name) ||
          operator.role.name !== actor.role
        ) {
          throw new ForbiddenException('Staff permission is required.');
        }

        const properties = await tx.property.findMany({
          select: { id: true },
          take: 2,
        });

        if (properties.length !== 1) {
          throw new InternalServerErrorException(
            'Exactly one property must be configured.',
          );
        }

        const booking = await tx.reservation.findFirst({
          where: {
            id: reservationId,
            roomType: { propertyId: properties[0].id },
          },
          include: {
            payments: {
              include: {
                refunds: true,
                events: { select: paymentEvidenceSelect },
              },
            },
          },
        });

        if (!booking) {
          throw new NotFoundException('Record not found.');
        }

        const now = new Date();

        const respond = (
          payment: Payment,
          payments: readonly SummaryPayment[],
          alreadyRecorded: boolean,
        ) => ({
          reservationNumber: booking.reservationNumber,
          reservationStatus: booking.status,
          receipt: {
            id: payment.id,
            method: payment.method,
            status: payment.status,
            amountCentavos: payment.amountCentavos,
            currency: payment.currency,
            paidAt: payment.paidAt,
          },
          summary: calculatePaymentSummary(
            booking.totalAmountCentavos,
            booking.status,
            payments,
            now,
          ),
          alreadyRecorded,
        });

        const existing = await tx.payment.findUnique({
          where: { id: receiptId },
          include: {
            refunds: true,
            events: { select: paymentEvidenceSelect },
          },
        });

        if (existing) {
          const audits = await tx.auditLog.findMany({
            where: {
              action: ACTION,
              entityType: 'Payment',
              entityId: receiptId,
            },
            select: {
              actorUserId: true,
              detailsJson: true,
            },
            take: 2,
          });

          let proof: unknown;

          try {
            proof = JSON.parse(audits[0]?.detailsJson ?? 'null');
          } catch {
            proof = null;
          }

          const validProof =
            proof !== null &&
            typeof proof === 'object' &&
            !Array.isArray(proof) &&
            'version' in proof &&
            proof.version === 1 &&
            'requestFingerprint' in proof &&
            proof.requestFingerprint === fingerprint;

          if (
            existing.reservationId !== booking.id ||
            existing.method !== 'PAY_AT_PROPERTY' ||
            existing.status !== 'PAID' ||
            existing.currency !== 'PHP' ||
            existing.amountCentavos !== input.amountCentavos ||
            !existing.paidAt ||
            !Number.isFinite(existing.paidAt.getTime()) ||
            existing.paidAt > now ||
            existing.provider ||
            existing.providerCheckoutId ||
            existing.providerPaymentId ||
            existing.checkoutRequestKeyHash ||
            existing.checkoutRequestFingerprint ||
            existing.checkoutState ||
            existing.checkoutUrl ||
            existing.refunds.length > 0 ||
            existing.events.length > 0 ||
            audits.length !== 1 ||
            audits[0].actorUserId !== actor.id ||
            !validProof
          ) {
            throw new ConflictException(
              'The existing request does not match this collection or requires review.',
            );
          }

          // A matching retry reads the receipt,
          // even if the booking has since closed.
          return respond(existing, booking.payments, true);
        }

        if (
          !['CONFIRMED', 'CHECKED_IN'].includes(booking.status) ||
          booking.checkOutDate <= todayInPhilippines()
        ) {
          throw new ConflictException(
            'Only active bookings with remaining stay dates can receive a new collection.',
          );
        }

        const summary = calculatePaymentSummary(
          booking.totalAmountCentavos,
          booking.status,
          booking.payments,
          now,
        );

        const unresolved = booking.payments.some(
          (payment) =>
            payment.status === 'PENDING' ||
            payment.refunds.length > 0 ||
            (
              payment.method === 'PAYMONGO' &&
              (
                payment.status !== 'PAID' ||
                !hasVerifiedPaymongoEvidence(payment)
              )
            ),
        );

        if (
          summary.requiresReview ||
          summary.balanceDueCentavos === null ||
          unresolved
        ) {
          throw new ConflictException(
            'Resolve payment attempts or financial review before collecting again.',
          );
        }

        if (
          summary.balanceDueCentavos <= 0 ||
          input.amountCentavos > summary.balanceDueCentavos
        ) {
          throw new ConflictException(
            'The collection exceeds the remaining booking balance.',
          );
        }

        const payment = await tx.payment.create({
          data: {
            id: receiptId,
            reservationId: booking.id,
            method: 'PAY_AT_PROPERTY',
            status: 'PAID',
            amountCentavos: input.amountCentavos,
            currency: 'PHP',
            paidAt: now,
          },
          include: {
            refunds: true,
            events: { select: paymentEvidenceSelect },
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: ACTION,
            entityType: 'Payment',
            entityId: payment.id,
            detailsJson: JSON.stringify({
              version: 1,
              requestFingerprint: fingerprint,
            }),
          },
        });

        return respond(payment, [...booking.payments, payment], false);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.warn(
        'Property collection could not be committed; check the original request before retrying.',
      );

      throw new ServiceUnavailableException(
        'Collection could not be saved. Retry only with the original requestId.',
      );
    }
  }
}