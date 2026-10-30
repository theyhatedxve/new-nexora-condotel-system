
import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';

import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

import { Public } from '../common/decorators/public.decorator.js';

import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from './auth.config.js';

describe('AuthController logout', () => {
  const allowedOrigin = 'http://localhost:5174';

  let controller: AuthController;
  let logoutMock: ReturnType<typeof vi.fn>;
  let clearCookieMock: ReturnType<typeof vi.fn>;

  const originalOrigins = process.env.AUTH_ALLOWED_ORIGINS;

  beforeEach(() => {
    process.env.AUTH_ALLOWED_ORIGINS =
      'http://localhost:5173,http://localhost:5174';

    logoutMock = vi.fn().mockResolvedValue(undefined);
    clearCookieMock = vi.fn();

    const authService = {
      logout: logoutMock,
    } as unknown as AuthService;

    controller = new AuthController(authService);
  });

  afterEach(() => {
    vi.clearAllMocks();

    if (originalOrigins === undefined) {
      delete process.env.AUTH_ALLOWED_ORIGINS;
    } else {
      process.env.AUTH_ALLOWED_ORIGINS = originalOrigins;
    }
  });

  function createRequest(
    token?: unknown,
  ): Request {
    const cookies =
      token === undefined
        ? {}
        : { [REFRESH_COOKIE_NAME]: token };

    return { cookies } as Request;
  }

  function createResponse(): Response {
    return {
      clearCookie: clearCookieMock,
    } as unknown as Response;
  }

  it('logs out using the current refresh cookie', async () => {
    const request = createRequest('a'.repeat(64));
    const response = createResponse();

    const result = await controller.logout(
      request,
      allowedOrigin,
      response,
    );

    expect(result).toBeUndefined();

    expect(logoutMock).toHaveBeenCalledExactlyOnceWith(
      'a'.repeat(64),
    );

    expect(clearCookieMock).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      REFRESH_COOKIE_OPTIONS,
    );
  });

  it('clears the cookie when no session is present', async () => {
    const request = createRequest();
    const response = createResponse();

    await controller.logout(
      request,
      allowedOrigin,
      response,
    );

    expect(logoutMock).toHaveBeenCalledWith(undefined);

    expect(clearCookieMock).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      REFRESH_COOKIE_OPTIONS,
    );
  });

  it('does not process logout from an unapproved origin', async () => {
    const request = createRequest('a'.repeat(64));
    const response = createResponse();

    await expect(
      controller.logout(
        request,
        'https://unapproved.example',
        response,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(logoutMock).not.toHaveBeenCalled();
    expect(clearCookieMock).not.toHaveBeenCalled();
  });

  it('rejects requests without an Origin header', async () => {
    await expect(
      controller.logout(
        createRequest(),
        undefined,
        createResponse(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(logoutMock).not.toHaveBeenCalled();
  });

  it('clears the cookie using the approved cookie path', async () => {
    await controller.logout(
      createRequest(),
      allowedOrigin,
      createResponse(),
    );

    const cookieOptions = clearCookieMock.mock.calls[0]?.[1];

    expect(cookieOptions).toMatchObject({
      httpOnly: true,
      path: '/api/auth',
      sameSite: 'strict',
    });
  });

  it('does not clear the cookie if revocation fails', async () => {
    logoutMock.mockRejectedValueOnce(
      new Error('Simulated database failure'),
    );

    await expect(
      controller.logout(
        createRequest('a'.repeat(64)),
        allowedOrigin,
        createResponse(),
      ),
    ).rejects.toThrow('Simulated database failure');

    expect(clearCookieMock).not.toHaveBeenCalled();
  });
});
