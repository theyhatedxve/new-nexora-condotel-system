import {
  createHash,
  randomBytes,
} from 'node:crypto';

import {
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import {
  withInventoryWrite,
} from './inventory-write.js';

import {
  BookingAccessEmailService,
} from './booking-access-email.service.js';

import {
  BOOKING_LINK_MS,
  BOOKING_SESSION_MS,
} from './booking-access.config.js';

import type {
  RequestBookingAccessDto,
} from './dto/booking-access.dto.js';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function hash(token: string): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

function validToken(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    TOKEN_PATTERN.test(value)
  );
}

function denied(): never {
  throw new NotFoundException(
    'Booking access is invalid or expired.',
  );
}

@Injectable()
export class BookingAccessService
  implements OnModuleDestroy
{
  private readonly logger = new Logger(
    BookingAccessService.name,
  );

  private readonly pending =
    new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: BookingAccessEmailService,
  ) {}

  request(input: RequestBookingAccessDto): void {
    // Return the same acknowledgment before lookup
    // and email delivery begin.
    const job = new Promise<void>((resolve) => {
      setImmediate(resolve);
    })
      .then(() => this.issueLink(input))
      .catch(() => {
        // Never log tokens, email addresses,
        // SMTP credentials, or provider error details.
        this.logger.warn(
          'Booking access delivery could not be completed.',
        );
      });

    this.pending.add(job);

    void job.then(() => {
      this.pending.delete(job);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.pending]);
  }

  private async issueLink(
    input: RequestBookingAccessDto,
  ): Promise<void> {
    const delivery = await withInventoryWrite(
      this.prisma,
      async (tx) => {
        const now = new Date();

        const reservation =
          await tx.reservation.findUnique({
            where: {
              reservationNumber:
                input.reservationNumber.trim(),
            },
            select: {
              id: true,
              guest: {
                select: {
                  email: true,
                },
              },
            },
          });

        const email =
          reservation?.guest.email?.trim();

        if (
          !reservation ||
          !email ||
          email.toLowerCase() !==
            input.email.trim().toLowerCase()
        ) {
          return null;
        }

        const recent =
          await tx.reservationAccessToken.findFirst({
            where: {
              reservationId: reservation.id,
              createdAt: {
                gt: new Date(
                  now.getTime() - 60_000,
                ),
              },
            },
            select: {
              id: true,
            },
          });

        if (recent) {
          return null;
        }

        const token = randomBytes(32)
          .toString('hex');

        await tx.reservationAccessToken.create({
          data: {
            reservationId: reservation.id,
            tokenHash: hash(token),
            expiresAt: new Date(
              now.getTime() + BOOKING_LINK_MS,
            ),
          },
        });

        return {
          email,
          token,
        };
      },
    );

    // SMTP is outside the database transaction.
    // Raw access tokens are never stored in the database.
    if (delivery) {
      await this.email.send(
        delivery.email,
        delivery.token,
      );
    }
  }

  async exchange(
    token: string,
    previousCookie: unknown,
  ) {
    return withInventoryWrite(
      this.prisma,
      async (tx) => {
        const now = new Date();

        const access =
          await tx.reservationAccessToken.findUnique({
            where: {
              tokenHash: hash(token),
            },
          });

        if (
          !access ||
          access.usedAt ||
          access.expiresAt <= now
        ) {
          denied();
        }

        const claimed =
          await tx.reservationAccessToken.updateMany({
            where: {
              id: access.id,
              usedAt: null,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              usedAt: now,
            },
          });

        if (claimed.count !== 1) {
          denied();
        }

        // Replace only the session this browser
        // presented. Other browsers remain independent.
        if (validToken(previousCookie)) {
          await tx.reservationAccessSession.updateMany({
            where: {
              tokenHash: hash(previousCookie),
              revokedAt: null,
            },
            data: {
              revokedAt: now,
            },
          });
        }

        const sessionToken = randomBytes(32)
          .toString('hex');

        const expiresAt = new Date(
          now.getTime() + BOOKING_SESSION_MS,
        );

        await tx.reservationAccessSession.create({
          data: {
            reservationId: access.reservationId,
            tokenHash: hash(sessionToken),
            expiresAt,
          },
        });

        return {
          sessionToken,
          expiresAt,
        };
      },
    );
  }

  async current(cookie: unknown) {
    if (!validToken(cookie)) {
      denied();
    }

    const session =
      await this.prisma.reservationAccessSession.findFirst({
        where: {
          tokenHash: hash(cookie),
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          expiresAt: true,
          reservation: {
            select: {
              reservationNumber: true,
              status: true,
              checkInDate: true,
              checkOutDate: true,
              guestCount: true,
              nightlyRateCentavos: true,
              totalAmountCentavos: true,
              holdExpiresAt: true,
              roomType: {
                select: {
                  name: true,
                },
              },
              guest: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

    if (!session) {
      denied();
    }

    return {
      ...session.reservation,
      accessExpiresAt: session.expiresAt,
    };
  }

  async logout(
    cookie: unknown,
  ): Promise<void> {
    if (!validToken(cookie)) {
      return;
    }

    await this.prisma.reservationAccessSession.updateMany({
      where: {
        tokenHash: hash(cookie),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}