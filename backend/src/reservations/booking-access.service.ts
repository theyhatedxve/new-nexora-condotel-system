import { randomBytes } from 'node:crypto';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { hash, validToken, denied, requireBookingSession } from './booking-access-security.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { withInventoryWrite } from './inventory-write.js';
import { BookingAccessEmailService } from './booking-access-email.service.js';
import { BOOKING_LINK_MS, BOOKING_SESSION_MS } from './booking-access.config.js';
import type { RequestBookingAccessDto } from './dto/booking-access.dto.js';


@Injectable()
export class BookingAccessService implements OnModuleDestroy {
  private readonly logger = new Logger(BookingAccessService.name);
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: BookingAccessEmailService,
  ) {}

  request(input: RequestBookingAccessDto): void {
    // Return the same acknowledgment before lookup/delivery starts.
    // This avoids exposing a match through response content or SMTP timing.
    const job = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => this.issueLink(input))
      .catch(() => { this.logger.warn('Booking access delivery could not be completed.'); });
    this.pending.add(job);
    void job.then(() => { this.pending.delete(job); });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.pending);
  }

  private async issueLink(input: RequestBookingAccessDto): Promise<void> {
    const delivery = await withInventoryWrite(this.prisma, async (tx) => {
      const now = new Date();
      const reservation = await tx.reservation.findUnique({
        where: { reservationNumber: input.reservationNumber.trim() },
        select: { id: true, guest: { select: { email: true } } },
      });
      const email = reservation?.guest.email?.trim();
      if (!reservation || !email || email.toLowerCase() !== input.email.trim().toLowerCase()) return null;
      const recent = await tx.reservationAccessToken.findFirst({
        where: { reservationId: reservation.id, createdAt: { gt: new Date(now.getTime() - 60_000) } },
        select: { id: true },
      });
      if (recent) return null;
      const token = randomBytes(32).toString('hex');
      await tx.reservationAccessToken.create({ data: {
        reservationId: reservation.id, tokenHash: hash(token),
        expiresAt: new Date(now.getTime() + BOOKING_LINK_MS),
      } });
      return { email, token };
    });
    // SMTP is outside the transaction. Raw tokens never enter the database.
    if (delivery) await this.email.send(delivery.email, delivery.token);
  }

  async exchange(token: string, previousCookie: unknown) {
    return withInventoryWrite(this.prisma, async (tx) => {
      const now = new Date();
      const access = await tx.reservationAccessToken.findUnique({ where: { tokenHash: hash(token) } });
      if (!access || access.usedAt || access.expiresAt <= now) denied();
      const claimed = await tx.reservationAccessToken.updateMany({
        where: { id: access.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) denied();
      // Replace only the session presented by this browser.
      if (validToken(previousCookie)) {
        await tx.reservationAccessSession.updateMany({
          where: { tokenHash: hash(previousCookie), revokedAt: null }, data: { revokedAt: now },
        });
      }
      const sessionToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(now.getTime() + BOOKING_SESSION_MS);
      await tx.reservationAccessSession.create({ data: {
        reservationId: access.reservationId, tokenHash: hash(sessionToken), expiresAt,
      } });
      return { sessionToken, expiresAt };
    });
  }

    async current(cookie: unknown) {
    const session = await requireBookingSession(
      this.prisma,
      cookie,
    );

    const reservation =
      await this.prisma.reservation.findUnique({
        where: {
          id: session.reservationId,
        },
        select: {
          reservationNumber: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          guestCount: true,
          nightlyRateCentavos: true,
          totalAmountCentavos: true,
          holdExpiresAt: true,
          bookingPolicyVersion: true,
          paymentPreference: true,
          expectedArrivalAt: true,
          firstContactedAt: true,
          responseDeadlineAt: true,
          confirmedAt: true,
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
      });

    if (!reservation) {
      denied();
    }

    return {
      ...reservation,
      holdExpired:
        reservation.status === 'PENDING' &&
        reservation.holdExpiresAt !== null &&
        reservation.holdExpiresAt.getTime() <=
          Date.now(),
      accessExpiresAt: session.expiresAt,
    };
  }

  async logout(cookie: unknown): Promise<void> {
    if (!validToken(cookie)) return;
    await this.prisma.reservationAccessSession.updateMany({
      where: { tokenHash: hash(cookie), revokedAt: null }, data: { revokedAt: new Date() },
    });
  }
}
