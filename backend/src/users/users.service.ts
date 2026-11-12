import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from '../auth/password.service.js';

import {
  STAFF_ROLES,
  staffUserSelect,
  staffUserView,
  type StaffRole,
  type StaffUserRecord,
} from './staff-user.definition.js';

import {
  STAFF_INVITATION_MINUTES,
  StaffInvitationService,
} from './staff-invitation.service.js';

import type { Prisma } from '../generated/prisma/client.js';
import type {
  AuthenticatedUser,
} from '../common/ownership/ownership.service.js';
import type {
  CreateStaffUserDto,
  StaffListQueryDto,
  StaffVersionDto,
  UpdateStaffUserDto,
} from './dto/staff-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly invitations: StaffInvitationService,
  ) {}

  private async authorize(
    tx: Prisma.TransactionClient,
    identity: AuthenticatedUser | undefined,
  ): Promise<string> {
    if (!identity?.id) {
      throw new UnauthorizedException('Authentication required.');
    }

    const actor = await tx.user.findUnique({
      where: { id: identity.id },
      select: {
        status: true,
        mustChangePassword: true,
        role: { select: { name: true } },
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
      identity.role !== 'ADMIN' ||
      actor.role.name !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Administrator permission is required.',
      );
    }

    return identity.id;
  }

  private async write<T>(
    identity: AuthenticatedUser | undefined,
    work: (
      tx: Prisma.TransactionClient,
      actorId: string,
    ) => Promise<T>,
  ): Promise<T> {
    if (!identity?.id) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Obtain SQLite's write lock before reading account invariants.
        // The parameter is bound through Prisma's tagged template.
        await tx.$executeRaw`
          UPDATE "User"
          SET "sessionVersion" = "sessionVersion"
          WHERE "id" = ${identity.id}
        `;

        const actorId = await this.authorize(tx, identity);

        return work(tx, actorId);
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account already uses that email. Reload the staff list.',
        );
      }

      throw new ServiceUnavailableException(
        'The account operation could not be confirmed. Reload the current record before submitting again.',
      );
    }
  }

  private async requireStaff(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<StaffUserRecord> {
    const user = await tx.user.findUnique({
      where: { id },
      select: staffUserSelect,
    });

    if (
      !user ||
      !STAFF_ROLES.includes(user.role.name as StaffRole)
    ) {
      throw new NotFoundException('Staff account not found.');
    }

    return user;
  }

  private assertVersion(
    current: StaffUserRecord,
    expected: string,
  ): void {
    if (current.updatedAt.toISOString() !== expected) {
      throw new ConflictException(
        'This account changed. Reload and review its current values.',
      );
    }
  }

  private nextVersion(current: StaffUserRecord): Date {
    return new Date(
      Math.max(Date.now(), current.updatedAt.getTime() + 1),
    );
  }

  private async roleId(
    tx: Prisma.TransactionClient,
    role: StaffRole,
  ): Promise<string> {
    const found = await tx.role.findUnique({
      where: { name: role },
      select: { id: true },
    });

    if (!found) {
      throw new InternalServerErrorException(
        'The selected staff role is not configured.',
      );
    }

    return found.id;
  }

  private invitation() {
    const token = randomBytes(32).toString('hex');

    return {
      token,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(
        Date.now() + STAFF_INVITATION_MINUTES * 60 * 1000,
      ),
    };
  }

  private async invalidateAccess(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
  ): Promise<void> {
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });

    await tx.staffSetupToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    });

    await tx.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    });
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    userId: string,
    action: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorUserId: actorId,
        action,
        entityType: 'User',
        entityId: userId,
        detailsJson: JSON.stringify({
          version: 1,
          ...details,
        }),
      },
    });
  }

  async list(
    query: StaffListQueryDto,
    identity: AuthenticatedUser | undefined,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.authorize(tx, identity);

      const search = query.q ?? '';

      const where: Prisma.UserWhereInput = {
        role: {
          name: query.role
            ? query.role
            : { in: [...STAFF_ROLES] },
        },
      };

      if (query.status) {
        where.status = query.status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search.toLowerCase() } },
        ];
      }

      const total = await tx.user.count({ where });
      const totalPages = Math.ceil(total / query.limit);

      const page = total === 0
        ? 1
        : Math.min(query.page, totalPages);

      const users = await tx.user.findMany({
        where,
        select: staffUserSelect,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (page - 1) * query.limit,
        take: query.limit,
      });

      return {
        items: users.map(staffUserView),
        total,
        page,
        limit: query.limit,
        totalPages,
      };
    });
  }

  async read(
    id: string,
    identity: AuthenticatedUser | undefined,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.authorize(tx, identity);

      return staffUserView(await this.requireStaff(tx, id));
    });
  }

  async create(
    input: CreateStaffUserDto,
    identity: AuthenticatedUser | undefined,
  ) {
    const inviting = input.setupMethod === 'INVITATION';

    if (inviting && input.temporaryPassword !== undefined) {
      throw new BadRequestException(
        'Choose one password setup method.',
      );
    }

    if (!inviting && !input.temporaryPassword) {
      throw new BadRequestException(
        'A temporary password is required.',
      );
    }

    if (inviting) {
      this.invitations.assertConfigured();
    }

    const invitation = inviting ? this.invitation() : null;

    // Invitation accounts receive an unknown random password.
    const initialPassword = inviting
      ? randomBytes(32).toString('hex')
      : input.temporaryPassword!;

    const passwordHash =
      await this.passwords.hashPassword(initialPassword);

    const user = await this.write(identity, async (tx, actorId) => {
      const duplicate = await tx.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          'An account already uses that email.',
        );
      }

      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          roleId: await this.roleId(tx, input.role),
          passwordHash,
          status: inviting ? 'PENDING' : 'ACTIVE',
          mustChangePassword: true,
        },
        select: staffUserSelect,
      });

      if (invitation) {
        await tx.staffSetupToken.create({
          data: {
            userId: created.id,
            tokenHash: invitation.tokenHash,
            expiresAt: invitation.expiresAt,
          },
        });
      }

      await this.audit(
        tx,
        actorId,
        created.id,
        'staff.account.created',
        {
          role: input.role,
          status: created.status,
          setupMethod: input.setupMethod,
        },
      );

      return staffUserView(created);
    });

    const delivery = invitation
      ? await this.invitations.send(user.email, invitation.token)
      : 'NOT_REQUESTED';

    return {
      user,
      delivery,
      invitationExpiresAt: invitation?.expiresAt ?? null,
    };
  }

  async update(
    id: string,
    input: UpdateStaffUserDto,
    identity: AuthenticatedUser | undefined,
  ) {
    return this.write(identity, async (tx, actorId) => {
      const current = await this.requireStaff(tx, id);

      this.assertVersion(current, input.updatedAt);

      if (
        id === actorId &&
        (input.role !== 'ADMIN' || input.status !== 'ACTIVE')
      ) {
        throw new ConflictException(
          'You cannot disable or demote your own account.',
        );
      }

      if (
        input.status === 'PENDING' &&
        current.status !== 'PENDING'
      ) {
        throw new BadRequestException(
          'Pending status is reserved for accounts awaiting setup.',
        );
      }

      const removesUsableAdmin =
        current.role.name === 'ADMIN' &&
        current.status === 'ACTIVE' &&
        !current.mustChangePassword &&
        (input.role !== 'ADMIN' || input.status !== 'ACTIVE');

      if (removesUsableAdmin) {
        const administrators = await tx.user.count({
          where: {
            role: { name: 'ADMIN' },
            status: 'ACTIVE',
            mustChangePassword: false,
          },
        });

        if (administrators <= 1) {
          throw new ConflictException(
            'At least one active Administrator must remain.',
          );
        }
      }

      const changed =
        input.name !== current.name ||
        input.role !== current.role.name ||
        input.status !== current.status;

      if (!changed) {
        return {
          user: staffUserView(current),
          changed: false,
        };
      }

      const securityChanged =
        input.role !== current.role.name ||
        input.status !== current.status;

      const updated = await tx.user.updateMany({
        where: {
          id,
          updatedAt: current.updatedAt,
        },
        data: {
          name: input.name,
          roleId: await this.roleId(tx, input.role),
          status: input.status,
          updatedAt: this.nextVersion(current),
          ...(securityChanged
            ? { sessionVersion: { increment: 1 } }
            : {}),
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'This account changed. Reload its current values.',
        );
      }

      if (securityChanged) {
        await this.invalidateAccess(tx, id, new Date());
      }

      await this.audit(
        tx,
        actorId,
        id,
        'staff.account.updated',
        {
          nameChanged: input.name !== current.name,
          previousRole: current.role.name,
          role: input.role,
          previousStatus: current.status,
          status: input.status,
          sessionsRevoked: securityChanged,
        },
      );

      return {
        user: staffUserView(await this.requireStaff(tx, id)),
        changed: true,
      };
    });
  }

  async resendInvitation(
    id: string,
    input: StaffVersionDto,
    identity: AuthenticatedUser | undefined,
  ) {
    this.invitations.assertConfigured();

    const invitation = this.invitation();

    const passwordHash = await this.passwords.hashPassword(
      randomBytes(32).toString('hex'),
    );

    const user = await this.write(identity, async (tx, actorId) => {
      const current = await this.requireStaff(tx, id);

      this.assertVersion(current, input.updatedAt);

      if (
        current.status === 'DISABLED' ||
        !current.mustChangePassword
      ) {
        throw new ConflictException(
          'Invitations require an enabled account awaiting password setup.',
        );
      }

      const updated = await tx.user.updateMany({
        where: {
          id,
          updatedAt: current.updatedAt,
        },
        data: {
          passwordHash,
          mustChangePassword: true,
          status: 'PENDING',
          sessionVersion: { increment: 1 },
          updatedAt: this.nextVersion(current),
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'This account changed. Reload its current values.',
        );
      }

      await this.invalidateAccess(tx, id, new Date());

      await tx.staffSetupToken.create({
        data: {
          userId: id,
          tokenHash: invitation.tokenHash,
          expiresAt: invitation.expiresAt,
        },
      });

      await this.audit(
        tx,
        actorId,
        id,
        'staff.invitation.issued',
        {
          outcome: 'CREATED',
          expiresAt: invitation.expiresAt.toISOString(),
        },
      );

      return staffUserView(await this.requireStaff(tx, id));
    });

    return {
      user,
      delivery: await this.invitations.send(
        user.email,
        invitation.token,
      ),
      invitationExpiresAt: invitation.expiresAt,
    };
  }
}
