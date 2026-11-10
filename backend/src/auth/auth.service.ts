import { type AuthResult } from './auth.types.js';
import { hashRefreshToken, getRefreshExpiry } from './refresh-token.js';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';
import { ACCESS_TOKEN_SECONDS, generateRefreshToken } from './auth.config.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  private async createAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      jti: randomUUID(),
    });
  }

  async login(data: LoginDto): Promise<AuthResult> {
    const email = data.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Keep credential failures indistinguishable to callers.
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const passwordMatches =
      await this.passwordService.verifyPassword(
        user.passwordHash,
        data.password,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const refreshToken = generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: getRefreshExpiry(),
      },
    });

    const accessToken = await this.createAccessToken(user.id);

    return {
      accessToken,
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

  async refresh(rawToken: string | undefined): Promise<AuthResult> {
    if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) {
      throw new UnauthorizedException(
        'Invalid refresh session.',
      );
    }

    const tokenHash = hashRefreshToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing || !existing.familyId) {
      throw new UnauthorizedException(
        'Invalid refresh session.',
      );
    }

    const now = new Date();

    // Reuse of a previously rotated token invalidates its family.
    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);

      throw new UnauthorizedException(
        'Invalid refresh session.',
      );
    }

    if (existing.expiresAt <= now) {
      await this.revokeFamily(existing.familyId);

      throw new UnauthorizedException(
        'Invalid refresh session.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      await this.revokeFamily(existing.familyId);

      throw new UnauthorizedException(
        'Invalid refresh session.',
      );
    }

    const nextRefreshToken = generateRefreshToken();
    const nextTokenHash = hashRefreshToken(nextRefreshToken);

    // An atomic conditional update ensures only one request
    // can consume the same refresh credential.
    const rotated = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.refreshToken.updateMany({
        where: {
          id: existing.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
        },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          familyId: existing.familyId,
          tokenHash: nextTokenHash,
          expiresAt: getRefreshExpiry(),
        },
      });

      return true;
    });

    if (!rotated) {
      await this.revokeFamily(existing.familyId);

      throw new UnauthorizedException(
        'Invalid refresh session.',
      );
    }

    const accessToken = await this.createAccessToken(user.id);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_SECONDS,
      refreshToken: nextRefreshToken,
    };
  }

    async logout(rawToken: string | undefined): Promise<void> {
    // Missing or malformed cookies should not expose
    // information about whether a session exists.
    if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) {
        return;
    }

    // Reuse the same hashing method as login and refresh.
    const tokenHash = hashRefreshToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: {
        familyId: true,
        },
    });

    // Unknown tokens and legacy tokens without a family
    // do not identify a revocable Step 3 session.
    if (!existing?.familyId) {
        return;
    }

    // End only this login session's token family.
    // Other devices have different familyIds.
    await this.revokeFamily(existing.familyId);
    }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

export { type PublicUser, type AuthResult } from './auth.types.js';
