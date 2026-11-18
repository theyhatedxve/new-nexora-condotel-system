import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import { GuestAccountsQueryDto } from './dto/guest-accounts-query.dto.js';

@Injectable()
export class GuestAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: GuestAccountsQueryDto,
    identity: AuthenticatedUser | undefined,
  ) {
    if (!identity?.id) {
      throw new UnauthorizedException('Authentication required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
        where: { id: identity.id },
        select: {
          status: true,
          mustChangePassword: true,
          role: {
            select: { name: true },
          },
        },
      });

      if (
        !actor ||
        actor.status !== 'ACTIVE' ||
        actor.mustChangePassword
      ) {
        throw new UnauthorizedException(
          'Active authentication is required.',
        );
      }

      if (
        !['SUPER_ADMIN', 'ADMIN'].includes(identity.role) ||
        actor.role.name !== identity.role
      ) {
        throw new ForbiddenException(
          'Administrator permission is required.',
        );
      }

      const q = query.q?.trim();

      const where: Prisma.UserWhereInput = {
        role: { name: 'GUEST' },
        ...(query.status ? { status: query.status } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {}),
      };

      const total = await tx.user.count({ where });
      const totalPages = Math.ceil(total / query.limit);
      const page = total === 0
        ? 1
        : Math.min(query.page, totalPages);

      const items = await tx.user.findMany({
        where,
        skip: (page - 1) * query.limit,
        take: query.limit,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        items,
        total,
        page,
        limit: query.limit,
        totalPages,
      };
    });
  }
}