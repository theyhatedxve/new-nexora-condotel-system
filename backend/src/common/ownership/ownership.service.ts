
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

import type { UserRole } from '../decorators/roles.decorator.js';

// This is the trusted identity returned by JwtStrategy.
// Never build it from request body or query parameters.
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class OwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  private requireIdentity(
    user: AuthenticatedUser | null | undefined,
  ): AuthenticatedUser {
    if (!user?.id || !user.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    return user;
  }

  private isAuthorizedStaff(
    user: AuthenticatedUser,
    allowedStaffRoles: readonly UserRole[],
  ): boolean {
    return allowedStaffRoles.some(
      (role) => role === user.role,
    );
  }

  async assertGuestAccess(
    user: AuthenticatedUser | null | undefined,
    guestId: string,
    allowedStaffRoles: readonly UserRole[] = [],
  ): Promise<void> {
    const authenticatedUser = this.requireIdentity(user);

    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!guest) {
      throw new NotFoundException('Record not found.');
    }

    // Staff may access this record only when the calling
    // feature explicitly grants their role permission.
    if (
      this.isAuthorizedStaff(
        authenticatedUser,
        allowedStaffRoles,
      )
    ) {
      return;
    }

    // Ordinary guests can access only their linked profile.
    if (
      authenticatedUser.role === 'GUEST' &&
      guest.userId === authenticatedUser.id
    ) {
      return;
    }

    throw new NotFoundException('Record not found.');
  }

  async assertReservationAccess(
    user: AuthenticatedUser | null | undefined,
    reservationId: string,
    allowedStaffRoles: readonly UserRole[] = [],
  ): Promise<void> {
    const authenticatedUser = this.requireIdentity(user);

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        guest: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Record not found.');
    }

    if (
      this.isAuthorizedStaff(
        authenticatedUser,
        allowedStaffRoles,
      )
    ) {
      return;
    }

    if (
      authenticatedUser.role === 'GUEST' &&
      reservation.guest.userId === authenticatedUser.id
    ) {
      return;
    }

    throw new NotFoundException('Record not found.');
  }
}
