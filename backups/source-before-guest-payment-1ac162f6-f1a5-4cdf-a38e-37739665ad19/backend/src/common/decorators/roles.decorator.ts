
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  GUEST: 'GUEST',
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export function Roles(...roles: UserRole[]) {
  if (roles.length === 0) {
    throw new Error('@Roles() requires at least one role.');
  }

  return SetMetadata(ROLES_KEY, roles);
}
