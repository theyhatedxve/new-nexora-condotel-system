import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import type { Prisma, GuestCredentialPurpose } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';
import { EmailService } from './email.service.js';
import type {
  GuestCredentialTokenDto, GuestEmailChangeDto, GuestPasswordChangeDto,
  GuestPasswordResetDto, GuestRecoveryEmailDto, GuestNewPasswordDto,
} from './dto/guest-credentials.dto.js';

type GuestUser = Prisma.UserGetPayload<{ include: { role: true } }>;
export const GUEST_RECOVERY_MESSAGE = 'If this email belongs to an eligible guest account, a password reset link will be sent. Wait one minute before requesting another link.';
const INVALID_LINK = 'This link is invalid, expired, or already used. Request a new link.';
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function eligible(user: GuestUser | null): user is GuestUser {
  return !!user && user.role.name === 'GUEST' && user.status === 'ACTIVE' && !user.mustChangePassword;
}

@Injectable()
export class GuestCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly email: EmailService,
  ) {}

  private async current(identity: AuthenticatedUser | undefined) {
    if (!identity?.id) throw new UnauthorizedException('Sign in to continue.');
    if (identity.role !== 'GUEST') throw new ForbiddenException('Guest access is required.');
    const user = await this.prisma.user.findUnique({ where: { id: identity.id }, include: { role: true } });
    if (!eligible(user) || user.email !== identity.email) {
      throw new UnauthorizedException('Your account changed. Sign in again.');
    }
    return user;
  }

  private guard(user: GuestUser) {
    return {
      id: user.id, roleId: user.roleId, email: user.email, passwordHash: user.passwordHash,
      sessionVersion: user.sessionVersion, updatedAt: user.updatedAt,
      status: 'ACTIVE' as const, mustChangePassword: false,
    };
  }

  private async reauthenticate(user: GuestUser, password: string) {
    if (!await this.passwords.verifyPassword(user.passwordHash, password)) {
      throw new BadRequestException('The current password is incorrect.');
    }
  }

  private async newPassword(user: GuestUser, input: GuestNewPasswordDto) {
    if (input.newPassword !== input.confirmPassword) throw new BadRequestException('The new passwords do not match.');
    if (await this.passwords.verifyPassword(user.passwordHash, input.newPassword)) {
      throw new BadRequestException('Choose a different password.');
    }
    return this.passwords.hashPassword(input.newPassword);
  }

  private async apply(
    tx: Prisma.TransactionClient, user: GuestUser,
    changes: { email: string } | { passwordHash: string }, action: string,
  ) {
    const now = new Date();
    const changed = await tx.user.updateMany({
      where: this.guard(user),
      data: {
        ...changes, sessionVersion: { increment: 1 },
        updatedAt: new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1)),
        failedLoginCount: 0, lockoutLevel: 0, lockedUntil: null, lastFailedLoginAt: null,
      },
    });
    if (changed.count !== 1) throw new ConflictException('Your account changed. Reload or request a new link before retrying.');
    await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
    await tx.guestCredentialToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    await tx.emailVerificationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    await tx.auditLog.create({ data: {
      actorUserId: user.id, action, entityType: 'User', entityId: user.id,
      detailsJson: JSON.stringify({ changedFields: ['email' in changes ? 'email' : 'password'], sessionsRevoked: true }),
    } });
    return { signInAgain: true };
  }

  async changePassword(input: GuestPasswordChangeDto, identity: AuthenticatedUser | undefined) {
    const user = await this.current(identity);
    await this.reauthenticate(user, input.currentPassword);
    const passwordHash = await this.newPassword(user, input);
    return this.prisma.$transaction((tx) => this.apply(tx, user, { passwordHash }, 'GUEST_PASSWORD_CHANGED'));
  }

  // Serializing issuance on User prevents concurrent requests from bypassing resend spacing.
  private async issue(user: GuestUser, purpose: GuestCredentialPurpose, pendingEmail?: string) {
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const issued = await this.prisma.$transaction(async (tx) => {
      const recent = await tx.guestCredentialToken.findFirst({ where: {
        userId: user.id, purpose, createdAt: { gt: new Date(now.getTime() - 60_000) },
      } });
      if (recent) return false;
      const claimed = await tx.user.updateMany({ where: this.guard(user), data: {
        updatedAt: new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1)),
      } });
      if (claimed.count !== 1) return false;
      await tx.guestCredentialToken.updateMany({ where: { userId: user.id, purpose, usedAt: null }, data: { usedAt: now } });
      await tx.guestCredentialToken.create({ data: {
        userId: user.id, purpose, tokenHash: hashToken(token), pendingEmail,
        sessionVersion: user.sessionVersion, expiresAt: new Date(now.getTime() + 30 * 60_000),
      } });
      return true;
    });
    return issued ? token : null;
  }

  async forgotPassword(input: GuestRecoveryEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() }, include: { role: true },
    });
    if (eligible(user)) {
      const token = await this.issue(user, 'RESET_PASSWORD');
      if (token) {
        try { await this.email.sendGuestCredentialEmail(user.email, token, 'RESET_PASSWORD'); }
        catch { await this.retireUndelivered(token); }
      }
    }
    return { message: GUEST_RECOVERY_MESSAGE };
  }

  private async retireUndelivered(token: string) {
    await this.prisma.guestCredentialToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null }, data: { usedAt: new Date() },
    });
  }

  async requestEmailChange(input: GuestEmailChangeDto, identity: AuthenticatedUser | undefined) {
    const user = await this.current(identity);
    await this.reauthenticate(user, input.currentPassword);
    const email = input.email.trim().toLowerCase();
    if (email === user.email) throw new BadRequestException('Enter a different email address.');
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('That email address is not available.');
    }
    const token = await this.issue(user, 'CHANGE_EMAIL', email);
    if (!token) throw new ConflictException('Wait one minute, reload, and try again. Use the newest email link.');
    try { await this.email.sendGuestCredentialEmail(email, token, 'CHANGE_EMAIL'); }
    catch {
      await this.retireUndelivered(token);
      throw new ServiceUnavailableException('Could not send the confirmation email. Your sign-in email has not changed. Wait one minute before retrying.');
    }
    return { message: 'A confirmation link was sent to your new email. Your current sign-in email remains active until you confirm. The link expires in 30 minutes.' };
  }

  private async link(token: string, purpose: GuestCredentialPurpose) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new BadRequestException(INVALID_LINK);
    const record = await this.prisma.guestCredentialToken.findUnique({
      where: { tokenHash: hashToken(token) }, include: { user: { include: { role: true } } },
    });
    if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date() ||
        !eligible(record.user) || record.sessionVersion !== record.user.sessionVersion) {
      throw new BadRequestException(INVALID_LINK);
    }
    return record;
  }

  private async consume(
    record: Awaited<ReturnType<GuestCredentialsService['link']>>,
    changes: { email: string } | { passwordHash: string }, action: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const claim = await tx.guestCredentialToken.updateMany({ where: {
          id: record.id, usedAt: null, expiresAt: { gt: new Date() }, sessionVersion: record.user.sessionVersion,
        }, data: { usedAt: new Date() } });
        if (claim.count !== 1) throw new BadRequestException(INVALID_LINK);
        return this.apply(tx, record.user, changes, action);
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('That email address is not available. Your sign-in email has not changed.');
      }
      throw error;
    }
  }

  async resetPassword(input: GuestPasswordResetDto) {
    const record = await this.link(input.token, 'RESET_PASSWORD');
    const passwordHash = await this.newPassword(record.user, input);
    return this.consume(record, { passwordHash }, 'GUEST_PASSWORD_RESET');
  }

  async confirmEmailChange(input: GuestCredentialTokenDto) {
    const record = await this.link(input.token, 'CHANGE_EMAIL');
    if (!record.pendingEmail) throw new BadRequestException(INVALID_LINK);
    return this.consume(record, { email: record.pendingEmail }, 'GUEST_EMAIL_CHANGED');
  }
}
