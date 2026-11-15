import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';
import {
  ACCESS_TOKEN_SECONDS,
  generateRefreshToken,
} from './auth.config.js';
import {
  hashRefreshToken,
  getRefreshExpiry,
} from './refresh-token.js';

import {
  afterFailedLogin,
  currentLoginState,
  RESET_LOGIN_FAILURES,
} from './login-lockout.policy.js';

import type { AuthResult } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  private async createAccessToken(
    userId: string,
    sessionVersion: number,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      jti: randomUUID(),
      sv: sessionVersion,
    });
  }

  private dummyPasswordHash: Promise<string> | undefined;

  async login(data: LoginDto): Promise<AuthResult> {
    const email = data.email.trim().toLowerCase();
    const invalid = () => new UnauthorizedException(
      'Invalid email or password. If you recently made several attempts, wait before retrying.',
    );

    const snapshot = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Unknown accounts still perform a password check.
    const passwordHash = snapshot?.passwordHash ?? await (
      this.dummyPasswordHash ??=
        this.passwordService.hashPassword(randomUUID())
    );
    const passwordMatches = await this.passwordService.verifyPassword(
      passwordHash,
      data.password,
    );

    if (!snapshot || snapshot.status !== 'ACTIVE') throw invalid();

    const refreshToken = generateRefreshToken();
    const outcome = await this.prisma.$transaction(async (tx) => {
      // Argon2 ran outside this transaction. Serialize state changes here.
      await tx.$executeRaw`
        UPDATE "User" SET "sessionVersion" = "sessionVersion"
        WHERE "id" = ${snapshot.id}
      `;

      const user = await tx.user.findUnique({
        where: { id: snapshot.id },
        include: { role: true },
      });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.sessionVersion !== snapshot.sessionVersion ||
        user.passwordHash !== snapshot.passwordHash
      ) {
        return { kind: 'invalid' as const };
      }

      const now = new Date();
      const state = currentLoginState(user, now);
      if (state.lockedUntil && state.lockedUntil > now) {
        if (!passwordMatches) {
          await tx.user.update({
            where: { id: user.id },
            data: { lastFailedLoginAt: now },
          });
          return { kind: 'invalid' as const };
        }

        return {
          kind: 'locked' as const,
          retryAfterSeconds: Math.ceil(
            (state.lockedUntil.getTime() - now.getTime()) / 1000,
          ),
        };
      }

      if (!passwordMatches) {
        await tx.user.update({
          where: { id: user.id },
          data: afterFailedLogin(state, now),
        });
        // Return instead of throwing so the failed-attempt write commits.
        return { kind: 'invalid' as const };
      }

      await tx.user.update({
        where: { id: user.id },
        data: { ...RESET_LOGIN_FAILURES },
      });

      if (user.mustChangePassword) {
        return { kind: 'password-change' as const };
      }

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          familyId: randomUUID(),
          tokenHash: hashRefreshToken(refreshToken),
          expiresAt: getRefreshExpiry(),
        },
      });
      return { kind: 'success' as const, user };
    }).catch((error: unknown) => {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Sign-in could not be confirmed. Please retry shortly.',
      );
    });

    if (outcome.kind === 'invalid') throw invalid();
    if (outcome.kind === 'locked') {
      throw new HttpException({
        code: 'LOGIN_TEMPORARILY_LOCKED',
        message: 'Sign-in is temporarily locked. Try again after the waiting period.',
        retryAfterSeconds: outcome.retryAfterSeconds,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (outcome.kind === 'password-change') {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change your temporary password before signing in.',
      });
    }

    const user = outcome.user;
    return {
      accessToken: await this.createAccessToken(user.id, user.sessionVersion),
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async refresh(
    rawToken: string | undefined,
  ): Promise<AuthResult> {
    if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) {
      throw new UnauthorizedException('Invalid refresh session.');
    }

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
    });

    if (!existing || !existing.familyId) {
      throw new UnauthorizedException('Invalid refresh session.');
    }

    const familyId = existing.familyId;
    const now = new Date();

    if (existing.revokedAt || existing.expiresAt <= now) {
      await this.revokeFamily(familyId);
      throw new UnauthorizedException('Invalid refresh session.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.mustChangePassword
    ) {
      await this.revokeFamily(familyId);
      throw new UnauthorizedException('Invalid refresh session.');
    }

    const nextRefreshToken = generateRefreshToken();

    const rotated = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({
        where: {
          id: existing.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (consumed.count !== 1) {
        return false;
      }

      // Recheck after obtaining the transactional write lock.
      const eligible = await tx.user.findFirst({
        where: {
          id: user.id,
          status: 'ACTIVE',
          mustChangePassword: false,
          sessionVersion: user.sessionVersion,
        },
        select: { id: true },
      });

      if (!eligible) {
        return false;
      }

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          familyId,
          tokenHash: hashRefreshToken(nextRefreshToken),
          expiresAt: getRefreshExpiry(),
        },
      });

      return true;
    });

    if (!rotated) {
      await this.revokeFamily(familyId);
      throw new UnauthorizedException('Invalid refresh session.');
    }

    const accessToken = await this.createAccessToken(
      user.id,
      user.sessionVersion,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) {
      return;
    }

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      select: { familyId: true },
    });

    if (!existing?.familyId) {
      return;
    }

    await this.revokeFamily(existing.familyId);
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}

export {
  type PublicUser,
  type AuthResult,
} from './auth.types.js';
