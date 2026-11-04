
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  ROLES_KEY,
  type UserRole,
} from '../decorators/roles.decorator.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      RequestWithUser
    >();

    if (!request.user) {
      throw new UnauthorizedException(
        'Authentication required.',
      );
    }

    const allowedRoles =
      this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // A protected route without @Roles still requires
    // authentication, but has no additional role restriction.
    if (allowedRoles === undefined) {
      return true;
    }

    const currentRole = request.user.role;

    if (!allowedRoles.includes(currentRole as UserRole)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    return true;
  }
}
