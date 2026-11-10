export const protectedStatuses = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
] as const;

export const blockFields = {
  id: true,
  roomId: true,
  startDate: true,
  endDate: true,
  reason: true,
  canceledAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
