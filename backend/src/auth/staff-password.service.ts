import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';

import type { Prisma } from '../generated/prisma/client.js';
import type {
  ChangeTemporaryPasswordDto,
  SetupStaffPasswordDto,
} from './dto/staff-password.dto.js';

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];

const INVALID_SETUP = 'Invalid or expired password setup link.';
const INVALID_TEMPORARY =
  'The temporary credentials are invalid or no longer usable.';

@Injectable()
export class StaffPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async finish(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
    action: string,
  ): Promise<void> {
    await tx.staffSetupToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    await tx.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        action,
        entityType: 'User',
        entityId: userId,
        detailsJson: JSON.stringify({
          outcome: 'COMPLETED',
        }),
      },
    });
  }

  async setupPassword(
    input: SetupStaffPasswordDto,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(input.token);

    const candidate = await this.prisma.staffSetupToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: true },
        },
      },
    });

    const now = new Date();

    if (
      !candidate ||
      candidate.usedAt ||
      candidate.expiresAt <= now ||
      !STAFF_ROLES.includes(candidate.user.role.name) ||
      !candidate.user.mustChangePassword ||
      !['PENDING', 'ACTIVE'].includes(candidate.user.status)
    ) {
      throw new UnauthorizedException(INVALID_SETUP);
    }

    const passwordHash =
      await this.passwords.hashPassword(input.newPassword);

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.staffSetupToken.updateMany({
        where: {
          id: candidate.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        throw new UnauthorizedException(INVALID_SETUP);
      }

      const updated = await tx.user.updateMany({
        where: {
          id: candidate.userId,
          roleId: candidate.user.roleId,
          status: { in: ['PENDING', 'ACTIVE'] },
          mustChangePassword: true,
          sessionVersion: candidate.user.sessionVersion,
          passwordHash: candidate.user.passwordHash,
        },
        data: {
          passwordHash,
          mustChangePassword: false,
          status: 'ACTIVE',
          sessionVersion: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new UnauthorizedException(INVALID_SETUP);
      }

      await this.finish(
        tx,
        candidate.userId,
        now,
        'STAFF_PASSWORD_SETUP_COMPLETED',
      );
    });

    return {
      message: 'Password setup completed. Sign in with your new password.',
    };
  }

  async changeTemporaryPassword(
    input: ChangeTemporaryPasswordDto,
  ): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.mustChangePassword ||
      !STAFF_ROLES.includes(user.role.name)
    ) {
      throw new UnauthorizedException(INVALID_TEMPORARY);
    }

    const matches = await this.passwords.verifyPassword(
      user.passwordHash,
      input.temporaryPassword,
    );

    if (!matches) {
      throw new UnauthorizedException(INVALID_TEMPORARY);
    }

    if (input.newPassword === input.temporaryPassword) {
      throw new BadRequestException(
        'Choose a different password from the temporary password.',
      );
    }

    const passwordHash =
      await this.passwords.hashPassword(input.newPassword);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          roleId: user.roleId,
          status: 'ACTIVE',
          mustChangePassword: true,
          sessionVersion: user.sessionVersion,
          passwordHash: user.passwordHash,
        },
        data: {
          passwordHash,
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new UnauthorizedException(INVALID_TEMPORARY);
      }

      await this.finish(
        tx,
        user.id,
        now,
        'STAFF_TEMPORARY_PASSWORD_CHANGED',
      );
    });

    return {
      message: 'Password changed. Sign in with your new password.',
    };
  }
}
