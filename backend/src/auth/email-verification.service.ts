
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from './email.service.js';

import {
  createVerificationToken,
  getVerificationExpiry,
  hashVerificationToken,
  normalizeEmail,
} from './registration.service.js';

const GENERIC_MESSAGE =
  'If the account is eligible, a verification email will be sent.';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async verifyEmail(token: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(token)) {
      throw new UnauthorizedException(
        'Invalid or expired verification link.',
      );
    }

    const tokenHash = hashVerificationToken(token);
    const now = new Date();

    // Claim the token and activate the account atomically.
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!existing) {
        throw new UnauthorizedException(
          'Invalid or expired verification link.',
        );
      }

      const claimed = await tx.emailVerificationToken.updateMany({
        where: {
          id: existing.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        throw new UnauthorizedException(
          'Invalid or expired verification link.',
        );
      }

      const activated = await tx.user.updateMany({
        where: {
          id: existing.userId,
          status: 'PENDING',
        },
        data: { status: 'ACTIVE' },
      });

      if (activated.count !== 1) {
        throw new UnauthorizedException(
          'Invalid or expired verification link.',
        );
      }

      // Any older verification links become unusable.
      await tx.emailVerificationToken.updateMany({
        where: {
          userId: existing.userId,
          usedAt: null,
        },
        data: { usedAt: now },
      });
    });
  }

  async resendVerification(
    rawEmail: string,
  ): Promise<{ message: string }> {
    const email = normalizeEmail(rawEmail);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user || user.status !== 'PENDING') {
      return { message: GENERIC_MESSAGE };
    }

    const token = createVerificationToken();
    const tokenHash = hashVerificationToken(token);

    await this.prisma.$transaction(async (tx) => {
      // Recheck status within the transaction.
      const pendingUser = await tx.user.findFirst({
        where: {
          id: user.id,
          status: 'PENDING',
        },
        select: { id: true },
      });

      if (!pendingUser) {
        return;
      }

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: getVerificationExpiry(),
        },
      });
    });

    // Ensure the newly created token still exists as an
    // active token before sending the email.
    const active = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: {
        usedAt: true,
      },
    });

    if (active && active.usedAt === null) {
      try {
        await this.emailService.sendVerificationEmail(email, token);
      } catch {
        // Do not expose SMTP failures to public callers.
        // The account remains PENDING.
      }
    }

    return { message: GENERIC_MESSAGE };
  }
}
