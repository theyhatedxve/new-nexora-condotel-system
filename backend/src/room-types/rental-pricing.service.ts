import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/ownership/ownership.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { withInventoryWrite } from '../reservations/inventory/inventory-write.js';
import { assertRentalRate, calculateRentalQuote, RENTAL_TYPES } from './rental-pricing.policy.js';
import type { RentalQuoteDto, SaveRentalPricingDto } from './dto/rental-pricing.dto.js';

type RoomPricing = Prisma.RoomTypeGetPayload<{ include: { rentalRates: true } }>;
const PRICING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

@Injectable()
export class RentalPricingService {
  constructor(private readonly prisma: PrismaService) {}

  private async authorize(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser | undefined,
  ): Promise<string> {
    if (!identity?.id) throw new UnauthorizedException('Authentication required.');
    const actor = await tx.user.findUnique({
      where: { id: identity.id },
      select: {
        status: true,
        mustChangePassword: true,
        role: { select: { name: true } },
      },
    });
    if (!actor || actor.status !== 'ACTIVE' || actor.mustChangePassword) {
      throw new UnauthorizedException('Active authentication is required.');
    }
    if (
      actor.role.name !== identity.role ||
      !PRICING_ROLES.includes(actor.role.name)
    ) {
      throw new ForbiddenException('Room pricing permission is required.');
    }
    return identity.id;
  }

  private async room(
    tx: Prisma.TransactionClient,
    id: string,
    activeOnly: boolean,
  ): Promise<RoomPricing> {
    const properties = await tx.property.findMany({
      select: { id: true }, take: 2,
    });
    if (properties.length !== 1) {
      throw new InternalServerErrorException('Exactly one property must be configured.');
    }
    const room = await tx.roomType.findFirst({
      where: {
        id,
        propertyId: properties[0].id,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { rentalRates: true },
    });
    if (!room) throw new NotFoundException('Room category not found.');
    return room;
  }

  private view(room: RoomPricing) {
    return {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      includedOccupancy: room.includedOccupancy ?? room.capacity,
      updatedAt: room.updatedAt.toISOString(),
      rates: room.rentalRates.map((rate) => ({
        rentalType: rate.rentalType,
        rateCentavos: rate.rateCentavos,
        extraPersonFeeCentavos: rate.extraPersonFeeCentavos,
        isActive: rate.isActive,
      })),
    };
  }

  async read(id: string, identity: AuthenticatedUser | undefined) {
    return this.prisma.$transaction(async (tx) => {
      await this.authorize(tx, identity);
      return this.view(await this.room(tx, id, false));
    });
  }

  async save(
    id: string,
    input: SaveRentalPricingDto,
    identity: AuthenticatedUser | undefined,
  ) {
    if (
      !Array.isArray(input.rates) ||
      input.rates.length !== RENTAL_TYPES.length ||
      new Set(input.rates.map((rate) => rate.rentalType)).size !== RENTAL_TYPES.length
    ) {
      throw new BadRequestException('Provide each of the four rental types once.');
    }
    for (const rate of input.rates) {
      if (
        !RENTAL_TYPES.includes(rate.rentalType) ||
        typeof rate.isActive !== 'boolean'
      ) {
        throw new BadRequestException('Invalid rental type or activity flag.');
      }
      assertRentalRate(rate);
    }
    const nightly = input.rates.find((rate) => rate.rentalType === 'NIGHTLY')!;
    if (!nightly.isActive) {
      throw new BadRequestException('Nightly pricing must remain enabled.');
    }

    return withInventoryWrite(this.prisma, async (tx) => {
      const actorId = await this.authorize(tx, identity);
      const current = await this.room(tx, id, false);
      if (new Date(input.updatedAt).getTime() !== current.updatedAt.getTime()) {
        throw new ConflictException('Pricing changed. Reload before saving.');
      }
      if (
        !Number.isSafeInteger(input.includedOccupancy) ||
        input.includedOccupancy < 1 ||
        input.includedOccupancy > current.capacity
      ) {
        throw new BadRequestException('Included occupancy must be within capacity.');
      }

      await tx.roomType.update({
        where: { id },
        data: {
          includedOccupancy: input.includedOccupancy,
          baseRateCentavos: nightly.rateCentavos,
          updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
        },
      });
      for (const rate of input.rates) {
        const values = {
          rateCentavos: rate.rateCentavos,
          extraPersonFeeCentavos: rate.extraPersonFeeCentavos,
          isActive: rate.isActive,
        };
        await tx.rentalRate.upsert({
          where: { roomTypeId_rentalType: { roomTypeId: id, rentalType: rate.rentalType } },
          create: { roomTypeId: id, rentalType: rate.rentalType, ...values },
          update: values,
        });
      }

      const saved = this.view(await this.room(tx, id, false));
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          action: 'room_type.pricing.updated',
          entityType: 'RoomType',
          entityId: id,
          detailsJson: JSON.stringify({
            version: 1, before: this.view(current), after: saved,
          }),
        },
      });
      return saved;
    });
  }

  async quote(id: string, input: RentalQuoteDto) {
    return this.prisma.$transaction(async (tx) => {
      const room = await this.room(tx, id, true);
      const rate = room.rentalRates.find(
        (entry) => entry.rentalType === input.rentalType,
      ) ?? (input.rentalType === 'NIGHTLY'
        ? {
            rateCentavos: room.baseRateCentavos,
            extraPersonFeeCentavos: 0,
            isActive: true,
          }
        : null);
      if (!rate?.isActive) {
        throw new ConflictException('This rental rate is not configured or enabled.');
      }
      return {
        roomTypeId: room.id,
        name: room.name,
        ...calculateRentalQuote(input, room, rate),
      };
    });
  }
}
