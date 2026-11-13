import type { Prisma } from '../generated/prisma/client.js';

export const STAFF_ROLES = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;

export const STAFF_STATUSES = [
  'PENDING',
  'ACTIVE',
  'DISABLED',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const staffUserSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: { name: true },
  },
} satisfies Prisma.UserSelect;

export type StaffUserRecord = Prisma.UserGetPayload<{
  select: typeof staffUserSelect;
}>;

export function staffUserView(user: StaffUserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
