import { HOLD_DURATION_MS } from '../reservations/policies/reservation-acquisition-policy.js';

export const PROPERTY_FIELDS = [
  'name',
  'address',
  'city',
  'province',
  'country',
  'phone',
  'email',
  'description',
] as const;

export const propertySelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  province: true,
  country: true,
  phone: true,
  email: true,
  description: true,
  updatedAt: true,
} as const;

export function propertySettingsReference() {
  return {
    reservationHoldMinutes:
      HOLD_DURATION_MS / 60_000,
  };
}
