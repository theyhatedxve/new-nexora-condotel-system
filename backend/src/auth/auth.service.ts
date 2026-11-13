import {
  ForbiddenException,
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

  async login(data: LoginDto): Promise<AuthResult> {
    const email = data.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches =
      await this.passwordService.verifyPassword(
        user.passwordHash,
        data.password,
      );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change your temporary password before signing in.',
      });
    }

    const refreshToken = generateRefreshToken();

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "User"
        SET "sessionVersion" = "sessionVersion"
        WHERE "id" = ${user.id}
      `;

      const eligible = await tx.user.findFirst({
        where: {
          id: user.id,
          status: 'ACTIVE',
          mustChangePassword: false,
          sessionVersion: user.sessionVersion,
          passwordHash: user.passwordHash,
        },
        select: { id: true },
      });

      if (!eligible) {
        throw new UnauthorizedException(
          'Account access changed. Sign in again.',
        );
      }

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          familyId: randomUUID(),
          tokenHash: hashRefreshToken(refreshToken),
          expiresAt: getRefreshExpiry(),
        },
      });
    });

    const accessToken = await this.createAccessToken(
      user.id,
      user.sessionVersion,
    );

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
