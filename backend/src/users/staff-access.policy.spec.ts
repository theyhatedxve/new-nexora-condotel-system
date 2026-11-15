import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { canManageStaff } from './staff-access.policy.js';
import { AuditController } from '../audit/audit.controller.js';
import { SettingsController } from '../settings/settings.controller.js';
import { RefundsController } from '../payments/refunds.controller.js';
import { PaymentReconciliationController } from '../payments/payment-reconciliation.controller.js';

class ProtectedActions {
  @Roles('SUPER_ADMIN')
  financialCorrection(this: void) {}

  @Roles('GUEST')
  guestBooking(this: void) {}
}

function context(
  action: keyof ProtectedActions,
  role: string,
): ExecutionContext {
  return {
    getHandler: () => ProtectedActions.prototype[action],
    getClass: () => ProtectedActions,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'actor', email: 'actor@example.invalid', role },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('five-role boundaries', () => {
  it.each(['MANAGER', 'RECEPTIONIST'])(
    'allows Admin to manage %s',
    (role) => expect(canManageStaff('ADMIN', role)).toBe(true),
  );

  it.each(['ADMIN', 'SUPER_ADMIN'])(
    'prevents Admin from managing another %s',
    (role) => expect(canManageStaff('ADMIN', role)).toBe(false),
  );

  it('permits Admin self-profile edits without granting peer management', () => {
    expect(canManageStaff('ADMIN', 'ADMIN', true)).toBe(true);
    expect(canManageStaff('ADMIN', 'SUPER_ADMIN', true)).toBe(false);
  });

  it.each(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST'])(
    'allows Super Admin to manage staff role %s',
    (role) => expect(canManageStaff('SUPER_ADMIN', role)).toBe(true),
  );

  it.each(['GUEST', 'MANAGER', 'RECEPTIONIST', undefined])(
    'denies staff administration to %s',
    (role) => expect(canManageStaff(role, 'RECEPTIONIST')).toBe(false),
  );

  it('does not turn staff management into guest-account management', () => {
    expect(canManageStaff('SUPER_ADMIN', 'GUEST')).toBe(false);
  });

  const guard = new RolesGuard(new Reflector());

  it('allows Super Admin on explicitly privileged routes', () => {
    expect(guard.canActivate(context('financialCorrection', 'SUPER_ADMIN'))).toBe(true);
  });

  it.each(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST'])(
    'denies financial correction to %s',
    (role) => expect(() =>
      guard.canActivate(context('financialCorrection', role)),
    ).toThrow(ForbiddenException),
  );

  it('does not bypass guest-only ownership entry points', () => {
    expect(() =>
      guard.canActivate(context('guestBooking', 'SUPER_ADMIN')),
    ).toThrow(ForbiddenException);
  });
});

describe.each([
  ['audit logs', AuditController],
  ['system settings', SettingsController],
  ['refund controls', RefundsController],
  ['reconciliation', PaymentReconciliationController],
] as const)('%s controller boundary', (_label, controller) => {
  function controllerContext(role: string): ExecutionContext {
    return {
      getHandler: () => () => undefined,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'actor', email: 'actor@example.invalid', role },
        }),
      }),
    } as unknown as ExecutionContext;
  }
  const guard = new RolesGuard(new Reflector());
  it('admits Super Admin', () => {
    expect(guard.canActivate(controllerContext('SUPER_ADMIN'))).toBe(true);
  });
  it.each(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'GUEST'])(
    'denies %s',
    (role) => expect(() =>
      guard.canActivate(controllerContext(role)),
    ).toThrow(ForbiddenException),
  );
});
