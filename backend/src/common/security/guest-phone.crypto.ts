import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';

export const GUEST_PHONE_PREFIX = 'nexora-phone:v1:';

const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException(
    'Guest phone data is unavailable. Contact the administrator.',
  );
}

function keyRing() {
  try {
    const activeId = process.env.NEXORA_GUEST_PHONE_ACTIVE_KEY_ID ?? '';
    const configured: unknown = JSON.parse(
      process.env.NEXORA_GUEST_PHONE_KEYS ?? '',
    );

    if (
      !KEY_ID_PATTERN.test(activeId) ||
      !configured ||
      typeof configured !== 'object' ||
      Array.isArray(configured)
    ) {
      throw new Error('Invalid phone key configuration.');
    }

    const keys = new Map<string, Buffer>();

    for (const [id, value] of Object.entries(configured)) {
      if (!KEY_ID_PATTERN.test(id) || typeof value !== 'string') {
        throw new Error('Invalid phone key entry.');
      }

      const key = Buffer.from(value, 'base64');
      if (key.length !== 32 || key.toString('base64') !== value) {
        throw new Error('Invalid phone key length or encoding.');
      }

      keys.set(id, key);
    }

    if (!keys.has(activeId)) {
      throw new Error('The active phone key is missing.');
    }

    return { activeId, keys };
  } catch {
    throw unavailable();
  }
}

export function activeGuestPhoneKeyId(): string {
  return keyRing().activeId;
}

function context(guestId: string, keyId: string): Buffer {
  if (!guestId || guestId.length > 100) {
    throw new Error('Invalid guest phone context.');
  }

  return Buffer.from(
    JSON.stringify(['NEXORA', 'Guest.phone', 'v1', keyId, guestId]),
    'utf8',
  );
}

function decode(value: string, expectedLength?: number): Buffer {
  if (!BASE64URL_PATTERN.test(value)) {
    throw new Error('Invalid encrypted phone encoding.');
  }

  const decoded = Buffer.from(value, 'base64url');

  if (
    decoded.toString('base64url') !== value ||
    (expectedLength !== undefined && decoded.length !== expectedLength)
  ) {
    throw new Error('Invalid encrypted phone component.');
  }

  return decoded;
}

export function encryptGuestPhone(
  value: string | null | undefined,
  guestId: string,
): string | null {
  if (value === null || value === undefined || value === '') return null;

  try {
    if (
      typeof value !== 'string' ||
      value.length > 30 ||
      Buffer.from(value, 'utf8').toString('utf8') !== value
    ) {
      throw new Error('Invalid guest phone value.');
    }

    const { activeId, keys } = keyRing();
    const key = keys.get(activeId)!;
    const nonce = randomBytes(12);

    const cipher = createCipheriv('aes-256-gcm', key, nonce, {
      authTagLength: 16,
    });
    cipher.setAAD(context(guestId, activeId));

    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    return [
      'nexora-phone',
      'v1',
      activeId,
      nonce.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  } catch {
    throw unavailable();
  }
}

export function decryptGuestPhone(
  value: string | null | undefined,
  guestId: string,
): string | null {
  if (value === null || value === undefined) return null;

  // Compatibility while existing development records are migrated.
  if (!value.startsWith('nexora-phone:')) {
    if (value.length > 30) throw unavailable();
    return value;
  }

  try {
    if (value.length > 512) {
      throw new Error('Invalid encrypted phone length.');
    }

    const parts = value.split(':');
    if (
      parts.length !== 6 ||
      parts[0] !== 'nexora-phone' ||
      parts[1] !== 'v1' ||
      !KEY_ID_PATTERN.test(parts[2])
    ) {
      throw new Error('Invalid encrypted phone format.');
    }

    const [, , keyId, encodedNonce, encodedTag, encodedValue] = parts;
    const key = keyRing().keys.get(keyId);
    if (!key) throw new Error('Required phone key is unavailable.');

    const nonce = decode(encodedNonce, 12);
    const tag = decode(encodedTag, 16);
    const ciphertext = decode(encodedValue);

    if (ciphertext.length > 120) {
      throw new Error('Invalid encrypted phone size.');
    }

    const decipher = createDecipheriv('aes-256-gcm', key, nonce, {
      authTagLength: 16,
    });
    decipher.setAAD(context(guestId, keyId));
    decipher.setAuthTag(tag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    const phone = plaintext.toString('utf8');

    if (
      !phone ||
      phone.length > 30 ||
      !Buffer.from(phone, 'utf8').equals(plaintext)
    ) {
      throw new Error('Invalid decrypted phone value.');
    }

    return phone;
  } catch {
    throw unavailable();
  }
}