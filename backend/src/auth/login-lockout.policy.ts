export const LOGIN_RESET_MS = 60 * 60 * 1000;
export const LOCKOUT_MINUTES = [1, 5, 15, 30] as const;

export interface LoginFailureState {
  failedLoginCount: number;
  lockoutLevel: number;
  lockedUntil: Date | null;
  lastFailedLoginAt: Date | null;
}

export const RESET_LOGIN_FAILURES: LoginFailureState = {
  failedLoginCount: 0,
  lockoutLevel: 0,
  lockedUntil: null,
  lastFailedLoginAt: null,
};

export function currentLoginState(
  state: LoginFailureState,
  now: Date,
): LoginFailureState {
  if (
    state.lastFailedLoginAt === null ||
    now.getTime() - state.lastFailedLoginAt.getTime() >= LOGIN_RESET_MS
  ) {
    return { ...RESET_LOGIN_FAILURES };
  }

  return {
    failedLoginCount: state.failedLoginCount,
    lockoutLevel: state.lockoutLevel,
    lockedUntil: state.lockedUntil,
    lastFailedLoginAt: state.lastFailedLoginAt,
  };
}

export function afterFailedLogin(
  state: LoginFailureState,
  now: Date,
): LoginFailureState {
  const current = currentLoginState(state, now);

  if (current.lockedUntil && current.lockedUntil > now) {
    // Blocked failures do not extend the current lock or advance its level.
    return { ...current, lastFailedLoginAt: now };
  }

  const failedLoginCount = Math.min(current.failedLoginCount + 1, 8);
  const lockoutLevel = failedLoginCount < 5
    ? 0
    : Math.min(current.lockoutLevel + 1, LOCKOUT_MINUTES.length);

  return {
    failedLoginCount,
    lockoutLevel,
    lastFailedLoginAt: now,
    lockedUntil: lockoutLevel === 0
      ? null
      : new Date(now.getTime() + LOCKOUT_MINUTES[lockoutLevel - 1] * 60_000),
  };
}
