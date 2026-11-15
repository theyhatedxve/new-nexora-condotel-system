import { describe, expect, it } from 'vitest';
import {
  afterFailedLogin,
  currentLoginState,
  LOGIN_RESET_MS,
  RESET_LOGIN_FAILURES,
} from './login-lockout.policy.js';

describe('progressive login lockout', () => {
  it('allows four failures, then uses 1/5/15/30/30-minute locks', () => {
    let now = new Date('2026-11-15T08:00:00.000Z');
    let state = { ...RESET_LOGIN_FAILURES };

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      state = afterFailedLogin(state, now);
      expect(state.failedLoginCount).toBe(attempt);
      expect(state.lockedUntil).toBeNull();
    }

    for (const minutes of [1, 5, 15, 30, 30]) {
      state = afterFailedLogin(state, now);
      expect(state.lockedUntil?.getTime()).toBe(
        now.getTime() + minutes * 60_000,
      );
      now = new Date(state.lockedUntil!.getTime());
    }
    expect(state.lockoutLevel).toBe(4);
    expect(state.failedLoginCount).toBe(8);
  });

  it('does not slide the expiry or advance the level while locked', () => {
    const now = new Date('2026-11-15T08:00:00.000Z');
    const state = {
      failedLoginCount: 5,
      lockoutLevel: 1,
      lockedUntil: new Date(now.getTime() + 60_000),
      lastFailedLoginAt: now,
    };
    const next = afterFailedLogin(state, new Date(now.getTime() + 10_000));
    expect(next.lockedUntil).toEqual(state.lockedUntil);
    expect(next.lockoutLevel).toBe(1);
    expect(next.failedLoginCount).toBe(5);
  });

  it('resets at one quiet hour, but not one millisecond earlier', () => {
    const lastFailedLoginAt = new Date('2026-11-15T08:00:00.000Z');
    const state = {
      failedLoginCount: 8,
      lockoutLevel: 4,
      lockedUntil: new Date(lastFailedLoginAt.getTime() + 30 * 60_000),
      lastFailedLoginAt,
    };
    expect(currentLoginState(
      state, new Date(lastFailedLoginAt.getTime() + LOGIN_RESET_MS - 1),
    ).lockoutLevel).toBe(4);
    expect(currentLoginState(
      state, new Date(lastFailedLoginAt.getTime() + LOGIN_RESET_MS),
    )).toEqual(RESET_LOGIN_FAILURES);
    expect(afterFailedLogin(
      state, new Date(lastFailedLoginAt.getTime() + LOGIN_RESET_MS),
    ).failedLoginCount).toBe(1);
  });
});
