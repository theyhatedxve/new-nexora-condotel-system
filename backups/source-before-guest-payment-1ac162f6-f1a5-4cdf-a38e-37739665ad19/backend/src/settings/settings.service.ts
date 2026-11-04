import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  BOOKING_LINK_MS,
} from '../reservations/booking-access.config.js';

import {
  HOLD_DURATION_MS,
} from '../reservations/reservation-acquisition.service.js';

import type {
  UpdatePropertySettingsDto,
} from './dto/update-property-settings.dto.js';

const PROPERTY_FIELDS = [
  'name',
  'address',
  'city',
  'province',
  'country',
  'phone',
  'email',
  'description',
] as const;

const propertySelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  province: true,
  country: true,
  phone: true,
  email: true,
  description: true,
  updatedAt: true,
} as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async authorize(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser | undefined,
  ) {
    if (!identity?.id) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    const actor = await tx.user.findUnique({
      where: { id: identity.id },
      select: {
        id: true,
        status: true,
        role: {
          select: { name: true },
        },
      },
    });

    if (!actor || actor.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Active authentication is required.',
      );
    }

    if (
      identity.role !== 'ADMIN' ||
      actor.role.name !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Administrator permission is required.',
      );
    }

    return actor.id;
  }

  private async property(
    tx: Prisma.TransactionClient,
  ) {
    const properties = await tx.property.findMany({
      select: propertySelect,
      take: 2,
    });

    if (properties.length !== 1) {
      throw new InternalServerErrorException(
        'Exactly one property must be configured.',
      );
    }

    return properties[0];
  }

  private reference() {
    return {
      reservationHoldMinutes:
        HOLD_DURATION_MS / 60_000,
      bookingLinkMinutes:
        BOOKING_LINK_MS / 60_000,
    };
  }

  async read(
    identity: AuthenticatedUser | undefined,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await this.authorize(tx, identity);

          return {
            property: await this.property(tx),
            reference: this.reference(),
          };
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'Property settings could not be read.',
      );
    }
  }

  async update(
    input: UpdatePropertySettingsDto,
    identity: AuthenticatedUser | undefined,
  ) {
    const version = new Date(input.updatedAt);

    if (
      !Number.isFinite(version.getTime()) ||
      version.toISOString() !== input.updatedAt
    ) {
      throw new BadRequestException(
        'Provide the original settings version.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const actorId = await this.authorize(
            tx,
            identity,
          );

          const current = await this.property(tx);

          if (
            current.updatedAt.getTime() !==
            version.getTime()
          ) {
            throw new ConflictException(
              'Settings have changed. Reload and review the current record.',
            );
          }

          const values = {
            name: input.name,
            address: input.address,
            city: input.city,
            province: input.province,
            country: input.country,
            phone: input.phone,
            email: input.email,
            description: input.description,
          };

          const changedFields =
            PROPERTY_FIELDS.filter(
              (field) =>
                current[field] !== values[field],
            );

          if (changedFields.length === 0) {
            return {
              property: current,
              reference: this.reference(),
              changed: false,
            };
          }

          const nextVersion = new Date(
            Math.max(
              Date.now(),
              current.updatedAt.getTime() + 1,
            ),
          );

          const updated = await tx.property.updateMany({
            where: {
              id: current.id,
              updatedAt: current.updatedAt,
            },
            data: {
              ...values,
              updatedAt: nextVersion,
            },
          });

          if (updated.count !== 1) {
            throw new ConflictException(
              'Settings have changed. Reload and review the current record.',
            );
          }

          await tx.auditLog.create({
            data: {
              actorUserId: actorId,
              action: 'property.settings.updated',
              entityType: 'Property',
              entityId: current.id,
              detailsJson: JSON.stringify({
                version: 1,
                outcome: 'UPDATED',
                changedFields,
              }),
            },
          });

          const property =
            await tx.property.findUnique({
              where: { id: current.id },
              select: propertySelect,
            });

          if (!property) {
            throw new InternalServerErrorException(
              'Property settings could not be read.',
            );
          }

          return {
            property,
            reference: this.reference(),
            changed: true,
          };
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'The settings save could not be confirmed. Reload the current record before submitting again.',
      );
    }
  }
}