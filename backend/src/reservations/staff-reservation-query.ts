export const roles = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;

export const fields = {
  id: true,
  reservationNumber: true,
  status: true,
  checkInDate: true,
  checkOutDate: true,
  guestCount: true,
  createdAt: true,
  roomType: {
    select: {
      id: true,
      name: true,
    },
  },
  guest: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;
