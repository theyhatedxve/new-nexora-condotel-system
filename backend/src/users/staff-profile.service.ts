import {
  BadRequestException, ConflictException, ForbiddenException, HttpException,
  Injectable, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';
import { STAFF_ROLES } from './staff-user.definition.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import type {
  ChangeMyEmailDto, ChangeMyPasswordDto, UpdateMyProfileDto,
} from './dto/staff-profile.dto.js';

type ProfileUser = Prisma.UserGetPayload<{ include: { role: true } }>;

function profileView(user: ProfileUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.staffPhone ?? '',
    address: user.staffAddress ?? '',
    role: user.role.name,
    updatedAt: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class StaffProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  private async current(
    identity: AuthenticatedUser | undefined,
    expectedVersion?: string,
  ): Promise<ProfileUser> {
    if (!identity?.id) {
      throw new UnauthorizedException('Sign in to continue.');
    }
    if (!STAFF_ROLES.some((role) => role === identity.role)) {
      throw new ForbiddenException('Staff access is required.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: identity.id }, include: { role: true },
    });
    if (
      !user || user.status !== 'ACTIVE' || user.mustChangePassword ||
      user.role.name !== identity.role || user.email !== identity.email
    ) {
      throw new UnauthorizedException('Your account changed. Sign in again.');
    }
    if (
      expectedVersion !== undefined &&
      user.updatedAt.getTime() !== Date.parse(expectedVersion)
    ) {
      throw new ConflictException('Your profile changed. Reload it before saving.');
    }
    return user;
  }

  private async verifyCurrentPassword(user: ProfileUser, password: string): Promise<void> {
    const valid = await this.passwords.verifyPassword(user.passwordHash, password);
    if (!valid) {
      // Incorrect reauthentication is a form error, not an expired session.
      throw new BadRequestException('The current password is incorrect.');
    }
  }

  private async write(
    user: ProfileUser,
    changes: Prisma.UserUpdateManyMutationInput,
    action: string,
    changedFields: string[],
    securityChanged = false,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const changed = await tx.user.updateMany({
          where: {
            id: user.id, updatedAt: user.updatedAt,
            sessionVersion: user.sessionVersion, passwordHash: user.passwordHash,
            roleId: user.roleId, status: 'ACTIVE', mustChangePassword: false,
          },
          data: {
            ...changes,
            updatedAt: new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1)),
            ...(securityChanged ? { sessionVersion: { increment: 1 } } : {}),
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException('Your account changed. Reload before saving again.');
        }
        if (securityChanged) {
          await tx.refreshToken.updateMany({
            where: { userId: user.id, revokedAt: null }, data: { revokedAt: now },
          });
          await tx.staffSetupToken.updateMany({
            where: { userId: user.id, usedAt: null }, data: { usedAt: now },
          });
          await tx.emailVerificationToken.updateMany({
            where: { userId: user.id, usedAt: null }, data: { usedAt: now },
          });
        }
        await tx.auditLog.create({
          data: {
            actorUserId: user.id, action, entityType: 'User', entityId: user.id,
            detailsJson: JSON.stringify({ changedFields, sessionsRevoked: securityChanged }),
          },
        });
        const updated = await tx.user.findUniqueOrThrow({
          where: { id: user.id }, include: { role: true },
        });
        return profileView(updated);
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      if (
        typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'P2002'
      ) {
        throw new ConflictException('That email is already used by another account.');
      }
      throw new ServiceUnavailableException(
        'The update could not be confirmed. Reload your profile before retrying.',
      );
    }
  }

  async read(identity: AuthenticatedUser | undefined) {
    return profileView(await this.current(identity));
  }

  async update(input: UpdateMyProfileDto, identity: AuthenticatedUser | undefined) {
    const user = await this.current(identity, input.updatedAt);
    return this.write(user, {
      name: input.name, staffPhone: input.phone || null, staffAddress: input.address || null,
    }, 'STAFF_PROFILE_UPDATED', ['name', 'phone', 'address']);
  }

  async changeEmail(input: ChangeMyEmailDto, identity: AuthenticatedUser | undefined) {
    const user = await this.current(identity, input.updatedAt);
    await this.verifyCurrentPassword(user, input.currentPassword);
    const email = input.email.trim().toLowerCase();
    if (email === user.email) {
      throw new BadRequestException('Enter a different email address.');
    }
    await this.write(user, { email }, 'STAFF_EMAIL_CHANGED', ['email'], true);
    return { id: user.id, signInAgain: true };
  }

  async changePassword(input: ChangeMyPasswordDto, identity: AuthenticatedUser | undefined) {
    const user = await this.current(identity, input.updatedAt);
    await this.verifyCurrentPassword(user, input.currentPassword);
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('The new passwords do not match.');
    }
    if (input.newPassword === input.currentPassword) {
      throw new BadRequestException('Choose a different password.');
    }
    const passwordHash = await this.passwords.hashPassword(input.newPassword);
    await this.write(user, { passwordHash }, 'STAFF_PASSWORD_CHANGED', ['password'], true);
    return { id: user.id, signInAgain: true };
  }
}
