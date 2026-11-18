import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  decryptGuestPhone,
  encryptGuestPhone,
} from './guest-phone.crypto.js';

const firstKey = Buffer.alloc(32, 7).toString('base64');
const secondKey = Buffer.alloc(32, 9).toString('base64');

describe('guest phone encryption', () => {
  beforeEach(() => {
    vi.stubEnv('NEXORA_GUEST_PHONE_ACTIVE_KEY_ID', 'phone-v1');
    vi.stubEnv(
      'NEXORA_GUEST_PHONE_KEYS',
      JSON.stringify({ 'phone-v1': firstKey }),
    );
  });

  afterEach(() => vi.unstubAllEnvs());

  it('round-trips phone values with a fresh nonce each time', () => {
    const first = encryptGuestPhone('+63 912 345 6789', 'guest-a');
    const second = encryptGuestPhone('+63 912 345 6789', 'guest-a');

    expect(first).not.toBe(second);
    expect(first).not.toContain('+63 912 345 6789');
    expect(decryptGuestPhone(first, 'guest-a')).toBe('+63 912 345 6789');
  });

  it('handles absent phones and legacy plaintext', () => {
    expect(encryptGuestPhone(undefined, 'guest-a')).toBeNull();
    expect(encryptGuestPhone('', 'guest-a')).toBeNull();
    expect(decryptGuestPhone(null, 'guest-a')).toBeNull();
    expect(decryptGuestPhone('09123456789', 'guest-a')).toBe('09123456789');
  });

  it('rejects ciphertext copied to another guest', () => {
    const encrypted = encryptGuestPhone('09123456789', 'guest-a');

    expect(() => decryptGuestPhone(encrypted, 'guest-b'))
      .toThrow(ServiceUnavailableException);
  });

  it('rejects a changed authentication tag', () => {
    const parts = encryptGuestPhone('09123456789', 'guest-a')!.split(':');
    parts[4] = (parts[4][0] === 'A' ? 'B' : 'A') + parts[4].slice(1);

    expect(() => decryptGuestPhone(parts.join(':'), 'guest-a'))
      .toThrow(ServiceUnavailableException);
  });

  it('rejects an incorrect key', () => {
    const encrypted = encryptGuestPhone('09123456789', 'guest-a');
    vi.stubEnv(
      'NEXORA_GUEST_PHONE_KEYS',
      JSON.stringify({ 'phone-v1': secondKey }),
    );

    expect(() => decryptGuestPhone(encrypted, 'guest-a'))
      .toThrow(ServiceUnavailableException);
  });

  it('requires configured keys for new nonempty phone values', () => {
    vi.stubEnv('NEXORA_GUEST_PHONE_KEYS', '');

    expect(() => encryptGuestPhone('09123456789', 'guest-a'))
      .toThrow(ServiceUnavailableException);
    expect(decryptGuestPhone('09123456789', 'guest-a')).toBe('09123456789');
  });

  it('retains old-key reads while new writes use the active key', () => {
    const original = encryptGuestPhone('09123456789', 'guest-a');

    vi.stubEnv('NEXORA_GUEST_PHONE_ACTIVE_KEY_ID', 'phone-v2');
    vi.stubEnv(
      'NEXORA_GUEST_PHONE_KEYS',
      JSON.stringify({ 'phone-v1': firstKey, 'phone-v2': secondKey }),
    );

    const next = encryptGuestPhone('09123456789', 'guest-a');
    expect(next).toContain('nexora-phone:v1:phone-v2:');
    expect(decryptGuestPhone(original, 'guest-a')).toBe('09123456789');
    expect(decryptGuestPhone(next, 'guest-a')).toBe('09123456789');
  });

  it('rejects malformed envelopes and invalid key lengths', () => {
    expect(() => decryptGuestPhone('nexora-phone:v2:invalid', 'guest-a'))
      .toThrow(ServiceUnavailableException);

    vi.stubEnv(
      'NEXORA_GUEST_PHONE_KEYS',
      JSON.stringify({ 'phone-v1': Buffer.alloc(31).toString('base64') }),
    );

    expect(() => encryptGuestPhone('09123456789', 'guest-a'))
      .toThrow(ServiceUnavailableException);
  });
});