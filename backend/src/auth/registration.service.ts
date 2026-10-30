
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';
import { EmailService } from './email.service.js';

import type { RegisterDto } from './dto/register.dto.js';

const VERIFICATION_LIFETIME_MS = 30 * 60 * 1000;

export const REGISTRATION_ACKNOWLEDGMENT = {
  message: 'Registration received.',
  accountStatus: 'PENDING' as const,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

export function getVerificationExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_LIFETIME_MS);
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
  ) {}

  async register(
    data: RegisterDto,
  ): Promise<typeof REGISTRATION_ACKNOWLEDGMENT> {
    const email = normalizeEmail(data.email);
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();

    // Avoid accepting names containing only whitespace.
    if (!firstName || !lastName) {
      throw new BadRequestException(
        'First and last name are required.',
);
    }

    // The existing account receives the same public response.
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return REGISTRATION_ACKNOWLEDGMENT;
    }

    const passwordHash =
      await this.passwordService.hashPassword(data.password);

    const token = createVerificationToken();

    try {
      await this.prisma.$transaction(async (tx) => {
        const guestRole = await tx.role.findUnique({
          where: { name: 'GUEST' },
          select: { id: true },
        });

        if (!guestRole) {
          throw new InternalServerErrorException(
            'Guest registration is unavailable.',
          );
        }

        const user = await tx.user.create({
          data: {
            roleId: guestRole.id,
            name: `${firstName} ${lastName}`,
            email,
            passwordHash,
            status: 'PENDING',
          },
        });

        await tx.guest.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            email,
          },
        });

        await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: hashVerificationToken(token),
            expiresAt: getVerificationExpiry(),
          },
        });
      });
    } catch (error: unknown) {
      // A concurrent request may have created this email
      // after the initial lookup. Return the same response.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        return REGISTRATION_ACKNOWLEDGMENT;
      }

      throw error;
    }

    // Database transaction has committed.
    // Do not disclose raw tokens in logs or responses.
    try {
      await this.emailService.sendVerificationEmail(email, token);
    } catch {
      // Account remains PENDING. The guest can request
      // another verification email once delivery is restored.
      // A monitoring system should record the delivery failure
      // without recording the token or password.
    }

    return REGISTRATION_ACKNOWLEDGMENT;
  }
}
