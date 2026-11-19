import { ForbiddenException } from '@nestjs/common';

import {
  getAllowedOrigins,
  REFRESH_COOKIE_OPTIONS,
} from './auth.config.js';

export type AuthRealm = 'guest' | 'staff';

const GUEST_ROLES = ['GUEST'];

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
];

export function getAuthRealm(value: string): AuthRealm {
  if (value !== 'guest' && value !== 'staff') {
    throw new ForbiddenException('Invalid authentication application.');
  }

  return value;
}

export function getAuthRealmRoles(realm: AuthRealm): string[] {
  return realm === 'guest' ? [...GUEST_ROLES] : [...STAFF_ROLES];
}

export function isAuthRealmRole(
  role: string,
  realm?: AuthRealm,
): boolean {
  // Existing shared endpoints retain their current behavior.
  return realm === undefined || getAuthRealmRoles(realm).includes(role);
}

function readOrigins(name: string): string[] {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`${name} must be configured.`);
  }

  const origins = value.split(',').map((origin) => origin.trim());

  for (const origin of origins) {
    let parsed: URL;

    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`${name} must contain valid origins.`);
    }

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new Error(`${name} must contain origins without paths.`);
    }
  }

  return [...new Set(origins)];
}

export function requireAuthRealmOrigin(
  realm: AuthRealm,
  origin: string | undefined,
): void {
  const guestOrigins = readOrigins('AUTH_GUEST_ALLOWED_ORIGINS');
  const staffOrigins = readOrigins('AUTH_STAFF_ALLOWED_ORIGINS');
  const allowedOrigins = getAllowedOrigins();

  if (guestOrigins.some((value) => staffOrigins.includes(value))) {
    throw new Error('Guest and staff authentication origins must differ.');
  }

  if (
    [...guestOrigins, ...staffOrigins].some(
      (value) => !allowedOrigins.includes(value),
    )
  ) {
    throw new Error(
      'Authentication origins must also appear in AUTH_ALLOWED_ORIGINS.',
    );
  }

  const realmOrigins = realm === 'guest' ? guestOrigins : staffOrigins;

  if (!origin || !realmOrigins.includes(origin)) {
    throw new ForbiddenException('Request origin is not allowed.');
  }
}

export function getAuthRealmCookie(realm: AuthRealm) {
  return {
    name: `nexora_${realm}_refresh`,
    options: {
      ...REFRESH_COOKIE_OPTIONS,
      path: `/api/auth/${realm}`,
    },
  };
}