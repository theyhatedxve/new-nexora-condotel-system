export const BOOKING_LINK_MS = 15 * 60 * 1000;
export const BOOKING_SESSION_MS = 30 * 60 * 1000;

export const BOOKING_COOKIE = 'nexora_booking_access';

export const ACCESS_ACKNOWLEDGMENT =
  'If the details match a booking, we will email an access link. ' +
  'If it does not arrive, wait one minute before requesting another.';

export function bookingCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/reservations/access',
  };
}