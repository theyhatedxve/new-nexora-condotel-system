export const roomFields = {
  id: true,
  roomNumber: true,
  floor: true,
  status: true,
  isActive: true,
  roomTypeId: true,
  roomType: {
    select: {
      id: true,
      name: true,
      capacity: true,
      isActive: true,
    },
  },
} as const;

export const protectedStatuses = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
] as const;
