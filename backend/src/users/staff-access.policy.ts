const staffRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];
const ordinaryRoles = ['MANAGER', 'RECEPTIONIST'];

export function canManageStaff(
  actorRole: string | undefined,
  targetRole: string,
  ownAccount = false,
): boolean {
  if (!staffRoles.includes(targetRole)) return false;
  if (actorRole === 'SUPER_ADMIN') return true;
  return actorRole === 'ADMIN' && (
    ordinaryRoles.includes(targetRole) ||
    (ownAccount && targetRole === 'ADMIN')
  );
}
