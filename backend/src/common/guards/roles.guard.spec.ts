
import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Public } from '../decorators/public.decorator.js';
import {
  Roles,
  USER_ROLES,
} from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

class ExampleController {
  @Public()
  publicEndpoint() {}

  authenticatedEndpoint() {}

  @Roles(USER_ROLES.ADMIN)
  adminEndpoint() {}

  @Roles(
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.RECEPTIONIST,
  )
  staffEndpoint() {}
}

interface TestUser {
  id: string;
  email: string;
  role: string;
}

function createContext(
  methodName: keyof ExampleController,
  user?: TestUser,
): ExecutionContext {
  return {
    getHandler: () => ExampleController.prototype[methodName],
    getClass: () => ExampleController,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function createUser(role: string): TestUser {
  return {
    id: 'test-user',
    email: 'user@example.invalid',
    role,
  };
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows explicitly public routes', () => {
    expect(
      guard.canActivate(createContext('publicEndpoint')),
    ).toBe(true);
  });

  it('rejects protected routes without a user', () => {
    expect(() =>
      guard.canActivate(
        createContext('authenticatedEndpoint'),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('allows authenticated users on unrestricted routes', () => {
    expect(
      guard.canActivate(
        createContext(
          'authenticatedEndpoint',
          createUser('GUEST'),
        ),
      ),
    ).toBe(true);
  });

  it('allows ADMIN on an ADMIN-only endpoint', () => {
    expect(
      guard.canActivate(
        createContext(
          'adminEndpoint',
          createUser('ADMIN'),
        ),
      ),
    ).toBe(true);
  });

  it('rejects RECEPTIONIST on an ADMIN-only endpoint', () => {
    expect(() =>
      guard.canActivate(
        createContext(
          'adminEndpoint',
          createUser('RECEPTIONIST'),
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects GUEST on a staff-only endpoint', () => {
    expect(() =>
      guard.canActivate(
        createContext(
          'staffEndpoint',
          createUser('GUEST'),
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows RECEPTIONIST on a staff endpoint', () => {
    expect(
      guard.canActivate(
        createContext(
          'staffEndpoint',
          createUser('RECEPTIONIST'),
        ),
      ),
    ).toBe(true);
  });

  it('allows MANAGER on a staff endpoint', () => {
    expect(
      guard.canActivate(
        createContext(
          'staffEndpoint',
          createUser('MANAGER'),
        ),
      ),
    ).toBe(true);
  });

  it('does not give ADMIN an implicit bypass', () => {
    class ManagerOnlyController {
      @Roles(USER_ROLES.MANAGER)
      managerOnly() {}
    }

    const context = {
      getHandler: () =>
        ManagerOnlyController.prototype.managerOnly.bind(
          ManagerOnlyController.prototype,
        ),
      getClass: () => ManagerOnlyController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: createUser('ADMIN'),
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects an unrecognized role on restricted routes', () => {
    expect(() =>
      guard.canActivate(
        createContext(
          'adminEndpoint',
          createUser('UNKNOWN_ROLE'),
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects an empty @Roles declaration', () => {
    expect(() => Roles()).toThrow(
      '@Roles() requires at least one role.',
    );
  });
});
