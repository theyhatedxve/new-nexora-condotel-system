export const STAFF_ROLES = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
];

export const CONTACT_ACTION =
  'reservation.guest_contact_recorded';

export const CONFIRM_ACTION =
  'reservation.guest_request_confirmed';

export const REJECT_ACTION =
  'reservation.guest_request_rejected';

export type StaffAction =
  | {
      kind: 'CONTACT';
      channel: 'PHONE' | 'EMAIL';
    }
  | {
      kind: 'CONFIRM';
    }
  | {
      kind: 'REJECT';
      reason: string;
    };
