import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  GUEST_BOOKING_POLICY_VERSION,
} from '../reservations/guest-booking-policy.js';

import {
  withInventoryWrite,
} from '../reservations/inventory-write.js';

import {
  expirePendingHoldsInTx,
} from '../reservations/reservation-lifecycle.js';

import {
  PaymongoCheckoutExpirationAdapter,
} from './paymongo-checkout-expiration.adapter.js';

const REQUESTED =
  'payment.checkout.expiration_requested';

const CONFIRMED =
  'payment.checkout.expiration_confirmed';

const REVIEW =
  'payment.checkout.expiration_review_required';

const RETRY =
  'payment.checkout.expiration_retry';

@Injectable()
export class GuestBookingDeadlineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider:
      PaymongoCheckoutExpirationAdapter,
  ) {}

  async runOnce(sessionLimit = 5) {
    if (
      !Number.isInteger(sessionLimit) ||
      sessionLimit < 1 ||
      sessionLimit > 10
    ) {
      throw new BadRequestException(
        'Session batch must be from 1 to 10.',
      );
    }

    const prepared = await withInventoryWrite(
      this.prisma,
      async (tx) => {
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

        const propertyId = properties[0].id;

        const local =
          await expirePendingHoldsInTx(
            tx,
            {
              propertyId,
              now: new Date(),
            },
          );

        const candidates = await tx.$queryRaw<
          { id: string }[]
        >`
          SELECT p."id"
          FROM "Payment" p
          JOIN "Reservation" r
            ON r."id" = p."reservationId"
          JOIN "RoomType" t
            ON t."id" = r."roomTypeId"
          WHERE t."propertyId" = ${propertyId}
            AND r."bookingPolicyVersion" =
              ${GUEST_BOOKING_POLICY_VERSION}
            AND r."paymentPreference" = 'PAYMONGO'
            AND r."status" IN ('EXPIRED', 'CANCELLED')
            AND p."method" = 'PAYMONGO'
            AND p."provider" = 'PAYMONGO'
            AND p."status" = 'PENDING'
            AND p."providerCheckoutId" IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM "AuditLog" a
              WHERE a."entityType" = 'Payment'
                AND a."entityId" = p."id"
                AND a."action" IN (
                  ${CONFIRMED},
                  ${REVIEW}
                )
            )
          ORDER BY COALESCE(
            (
              SELECT MAX(a.rowid)
              FROM "AuditLog" a
              WHERE a."entityType" = 'Payment'
                AND a."entityId" = p."id"
                AND a."action" = ${REQUESTED}
            ),
            0
          ), p."id"
          LIMIT ${sessionLimit}
        `;

        return {
          propertyId,
          local,
          candidates,
        };
      },
    );

    let closedSessions = 0;
    let retrySessions = 0;
    let reviewSessions = 0;

    for (const candidate of prepared.candidates) {
      const input = await withInventoryWrite(
        this.prisma,
        async (tx) => {
          const payment =
            await tx.payment.findFirst({
              where: {
                id: candidate.id,
                method: 'PAYMONGO',
                provider: 'PAYMONGO',
                status: 'PENDING',
                providerCheckoutId: {
                  not: null,
                },
                reservation: {
                  bookingPolicyVersion:
                    GUEST_BOOKING_POLICY_VERSION,
                  paymentPreference:
                    'PAYMONGO',
                  status: {
                    in: [
                      'EXPIRED',
                      'CANCELLED',
                    ],
                  },
                  roomType: {
                    propertyId:
                      prepared.propertyId,
                  },
                },
              },
              select: {
                id: true,
                providerCheckoutId: true,
              },
            });

          if (!payment?.providerCheckoutId) {
            return null;
          }

          const finished =
            await tx.auditLog.findFirst({
              where: {
                entityType: 'Payment',
                entityId: payment.id,
                action: {
                  in: [
                    CONFIRMED,
                    REVIEW,
                  ],
                },
              },
              select: {
                id: true,
              },
            });

          if (finished) {
            return null;
          }

          await tx.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              checkoutUrl: null,
            },
          });

          await tx.auditLog.create({
            data: {
              action: REQUESTED,
              entityType: 'Payment',
              entityId: payment.id,
            },
          });

          return {
            paymentId: payment.id,
            checkoutSessionId:
              payment.providerCheckoutId,
          };
        },
      );

      if (!input) {
        continue;
      }

      let outcome:
        | 'EXPIRED'
        | 'REVIEW_REQUIRED'
        | 'RETRY';

      try {
        outcome =
          await this.provider.close(input);
      } catch (error) {
        if (
          !(error instanceof
            ServiceUnavailableException)
        ) {
          throw error;
        }

        outcome = 'RETRY';
      }

      const saved = await withInventoryWrite(
        this.prisma,
        async (tx) => {
          const payment =
            await tx.payment.findUnique({
              where: {
                id: input.paymentId,
              },
              select: {
                status: true,
                providerCheckoutId: true,
                reservation: {
                  select: {
                    status: true,
                  },
                },
              },
            });

          if (
            !payment ||
            payment.status !== 'PENDING' ||
            payment.providerCheckoutId !==
              input.checkoutSessionId ||
            ![
              'EXPIRED',
              'CANCELLED',
            ].includes(
              payment.reservation.status,
            )
          ) {
            return false;
          }

          const finished =
            await tx.auditLog.findFirst({
              where: {
                entityType: 'Payment',
                entityId: input.paymentId,
                action: {
                  in: [
                    CONFIRMED,
                    REVIEW,
                  ],
                },
              },
              select: {
                id: true,
              },
            });

          if (finished) {
            return false;
          }

          await tx.auditLog.create({
            data: {
              action:
                outcome === 'EXPIRED'
                  ? CONFIRMED
                  : outcome === 'REVIEW_REQUIRED'
                    ? REVIEW
                    : RETRY,
              entityType: 'Payment',
              entityId: input.paymentId,
              detailsJson: JSON.stringify({
                version: 1,
                providerCheckoutId:
                  input.checkoutSessionId,
                outcome,
              }),
            },
          });

          return true;
        },
      );

      if (!saved) {
        continue;
      }

      if (outcome === 'EXPIRED') {
        closedSessions += 1;
      } else if (
        outcome === 'REVIEW_REQUIRED'
      ) {
        reviewSessions += 1;
      } else {
        retrySessions += 1;
      }
    }

    const unknownSessions =
      await this.prisma.payment.count({
        where: {
          method: 'PAYMONGO',
          provider: 'PAYMONGO',
          status: 'PENDING',
          providerCheckoutId: null,
          reservation: {
            bookingPolicyVersion:
              GUEST_BOOKING_POLICY_VERSION,
            paymentPreference: 'PAYMONGO',
            status: {
              in: [
                'EXPIRED',
                'CANCELLED',
              ],
            },
            roomType: {
              propertyId:
                prepared.propertyId,
            },
          },
        },
      });

    return {
      ...prepared.local,
      closedSessions,
      retrySessions,
      reviewSessions,
      unknownSessions,
    };
  }
}