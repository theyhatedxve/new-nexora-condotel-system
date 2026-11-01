import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  withInventoryWrite,
} from './inventory-write.js';

import {
  expirePendingHoldsInTx,
  MAX_EXPIRATION_BATCH,
} from './reservation-lifecycle.js';

@Injectable()
export class ReservationLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async expireHolds(
    actor: AuthenticatedUser | undefined,
    limit = MAX_EXPIRATION_BATCH,
  ) {
    if (!actor?.id || !actor.role) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    if (
      !['ADMIN', 'MANAGER', 'RECEPTIONIST']
        .includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Staff permission is required.',
      );
    }

    return withInventoryWrite(
      this.prisma,
      async (tx) => {
        const properties =
          await tx.property.findMany({
            select: {
              id: true,
            },
            take: 2,
          });

        if (properties.length !== 1) {
          throw new InternalServerErrorException(
            'Exactly one property must be configured.',
          );
        }

        return expirePendingHoldsInTx(
          tx,
          {
            propertyId: properties[0].id,
            now: new Date(),
            limit,
            actorUserId: actor.id,
          },
        );
      },
    );
  }
}