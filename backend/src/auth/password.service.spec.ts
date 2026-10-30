
import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  const testPassword = 'Nexora-Test-Password-2026!';

  it('hashes a password using Argon2id', async () => {
    const hash = await passwordService.hashPassword(testPassword);

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toBe(testPassword);
  });

  it('verifies the correct password', async () => {
    const hash = await passwordService.hashPassword(testPassword);

    const isValid = await passwordService.verifyPassword(
      hash,
      testPassword,
    );

    expect(isValid).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await passwordService.hashPassword(testPassword);

    const isValid = await passwordService.verifyPassword(
      hash,
      'Incorrect-Password!',
    );

    expect(isValid).toBe(false);
  });

  it('generates a different hash for the same password', async () => {
    const firstHash = await passwordService.hashPassword(testPassword);
    const secondHash = await passwordService.hashPassword(testPassword);

    expect(firstHash).not.toBe(secondHash);

    expect(
      await passwordService.verifyPassword(firstHash, testPassword),
    ).toBe(true);

    expect(
      await passwordService.verifyPassword(secondHash, testPassword),
    ).toBe(true);
  });

  
    it('uses the approved Argon2id parameters', async () => {
    const hash = await passwordService.hashPassword(testPassword);

    expect(hash).toMatch(/^\$argon2id\$v=19\$/);

    const parameterSection = hash.split('$')[3];
    const parameters = Object.fromEntries(
        parameterSection.split(',').map((entry) => entry.split('=')),
    );

    expect(parameters).toEqual({
        m: '65536',
        t: '3',
        p: '1',
    });
    });


  it('rejects an empty password when checking a nonempty password hash', async () => {
    const hash = await passwordService.hashPassword(testPassword);

    const isValid = await passwordService.verifyPassword(
      hash,
      '',
    );

    expect(isValid).toBe(false);
  });

  it('rejects a malformed password hash', async () => {
    await expect(
      passwordService.verifyPassword(
        'invalid-password-hash',
        testPassword,
      ),
    ).rejects.toThrow();
  });
});
