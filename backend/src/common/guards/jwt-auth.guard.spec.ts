
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Public } from '../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

class ExampleController {
  @Public()
  publicEndpoint() {}

  protectedEndpoint() {}
}

function createContext(
  methodName: 'publicEndpoint' | 'protectedEndpoint',
): ExecutionContext {
  return {
    getHandler: () => ExampleController.prototype[methodName],
    getClass: () => ExampleController,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);

  it('allows an explicitly public endpoint', () => {
    const context = createContext('publicEndpoint');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('does not mark ordinary endpoints as public', () => {
    const context = createContext('protectedEndpoint');

    const isPublic = reflector.getAllAndOverride<boolean>(
      'isPublic',
      [context.getHandler(), context.getClass()],
    );

    expect(isPublic).toBeUndefined();
  });

  it('rejects a request without an authenticated user', () => {
    expect(() =>
      guard.handleRequest(null, false),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a Passport authentication error', () => {
    expect(() =>
      guard.handleRequest(new Error('Invalid token'), null),
    ).toThrow(UnauthorizedException);
  });

  it('returns the validated authenticated user', () => {
    const user = {
      id: 'test-user',
      email: 'admin@example.invalid',
      role: 'ADMIN',
    };

    expect(guard.handleRequest(null, user)).toEqual(user);
  });

  it('delegates protected routes to Passport', () => {
    const passportGuardPrototype = Object.getPrototypeOf(
      JwtAuthGuard.prototype,
    ) as {
      canActivate: (context: ExecutionContext) => unknown;
    };

    const passportSpy = vi
      .spyOn(passportGuardPrototype, 'canActivate')
      .mockReturnValue(true);

    try {
      expect(
        guard.canActivate(createContext('protectedEndpoint')),
      ).toBe(true);

      expect(passportSpy).toHaveBeenCalledOnce();
    } finally {
      passportSpy.mockRestore();
    }
  });
});
