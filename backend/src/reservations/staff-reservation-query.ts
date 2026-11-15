import { RENTAL_RESERVATION_SELECT } from './rental-reservation.js';
export const roles = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
] as const;

export const fields = {
  id: true,
  reservationNumber: true,
  status: true,
  ...RENTAL_RESERVATION_SELECT,
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
