import {
  tmpdir,
} from 'node:os';

import {
  resolve,
} from 'node:path';

import {
  Logger,
} from '@nestjs/common';

import {
  Test,
} from '@nestjs/testing';

import type {
  TestingModule,
} from '@nestjs/testing';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  GuestBookingDeadlineService,
} from './guest-booking-deadline.service.js';

import {
  GuestBookingDeadlineWorker,
} from './guest-booking-deadline.worker.js';

type PassResult = Awaited<
  ReturnType<
    GuestBookingDeadlineService['runOnce']
  >
>;

const emptyResult: PassResult = {
  expiredCount: 0,
  releasedAssignmentCount: 0,
  hasMore: false,
  closedSessions: 0,
  retrySessions: 0,
  reviewSessions: 0,
  unknownSessions: 0,
};

const runOnce = vi.fn<
  GuestBookingDeadlineService['runOnce']
>();

let moduleRef: TestingModule | undefined;
let worker: GuestBookingDeadlineWorker | undefined;
let finishPass: (() => void) | undefined;

function runtimeUrl(filename: string): string {
  const path = resolve(
    tmpdir(),
    'nexora-worker-unit-fixture',
    filename,
  );

  return `file:${path.replaceAll('\\', '/')}`;
}

function enableWorker(): void {
  vi.stubEnv(
    'NEXORA_BOOKING_DEADLINE_WORKER_ENABLED',
    'true',
  );

  vi.stubEnv(
    'NEXORA_RUNTIME_DATABASE_URL',
    runtimeUrl('worker.test.db'),
  );
}

function deferredPass(): Promise<PassResult> {
  return new Promise((resolvePass) => {
    finishPass = () => {
      resolvePass(emptyResult);
    };
  });
}

beforeEach(async () => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
    ],
  });

  vi.stubEnv(
    'NEXORA_BOOKING_DEADLINE_WORKER_ENABLED',
    'false',
  );

  vi.stubEnv(
    'NEXORA_RUNTIME_DATABASE_URL',
    '',
  );

  vi.spyOn(
    Logger.prototype,
    'warn',
  ).mockImplementation(() => undefined);

  runOnce.mockReset();
  runOnce.mockResolvedValue(emptyResult);

  finishPass = undefined;

  moduleRef = await Test.createTestingModule({
    providers: [
      GuestBookingDeadlineWorker,
      {
        provide: GuestBookingDeadlineService,
        useValue: {
          runOnce,
        },
      },
    ],
  }).compile();

  worker = moduleRef.get(
    GuestBookingDeadlineWorker,
  );
});

afterEach(async () => {
  try {
    finishPass?.();

    await worker?.onModuleDestroy();
    await moduleRef?.close();
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();

    worker = undefined;
    moduleRef = undefined;
    finishPass = undefined;
  }
});

function currentWorker(): GuestBookingDeadlineWorker {
  if (!worker) {
    throw new Error(
      'Synthetic worker is unavailable.',
    );
  }

  return worker;
}

describe('guest booking deadline worker', () => {
  it('stays disabled when its flag is absent', async () => {
    vi.stubEnv(
      'NEXORA_BOOKING_DEADLINE_WORKER_ENABLED',
      undefined,
    );

    currentWorker().onModuleInit();

    await vi.advanceTimersByTimeAsync(
      120_000,
    );

    expect(runOnce).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    '',
    'false',
    'TRUE',
  ])('does not enable processing with flag "%s"', async (flag) => {
    vi.stubEnv(
      'NEXORA_BOOKING_DEADLINE_WORKER_ENABLED',
      flag,
    );

    currentWorker().onModuleInit();

    await vi.advanceTimersByTimeAsync(
      120_000,
    );

    expect(runOnce).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['missing runtime target', ''],
    ['relative file URL', 'file:worker.test.db'],
    ['development database', runtimeUrl('dev.db')],
    ['uppercase development database', runtimeUrl('DEV.DB')],
    ['ordinary database filename', runtimeUrl('worker.db')],
    ['unsupported URL scheme', 'https://example.invalid/worker.test.db'],
  ])('rejects %s before scheduling work', (_description, url) => {
    vi.stubEnv(
      'NEXORA_BOOKING_DEADLINE_WORKER_ENABLED',
      'true',
    );

    vi.stubEnv(
      'NEXORA_RUNTIME_DATABASE_URL',
      url,
    );

    expect(() =>
      currentWorker().onModuleInit(),
    ).toThrow(
      'The deadline worker currently requires an explicit absolute .test.db runtime target.',
    );

    expect(runOnce).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits one second before its initial pass', async () => {
    enableWorker();

    currentWorker().onModuleInit();

    await vi.advanceTimersByTimeAsync(999);

    expect(runOnce).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(runOnce).toHaveBeenCalledTimes(1);
  });

  it('waits sixty seconds after a completed pass', async () => {
    enableWorker();

    currentWorker().onModuleInit();

    await vi.advanceTimersByTimeAsync(1000);

    expect(runOnce).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(
      59_999,
    );

    expect(runOnce).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(runOnce).toHaveBeenCalledTimes(2);
  });

  it('does not overlap a slow pass', async () => {
    enableWorker();

    const pending = deferredPass();

    runOnce.mockImplementationOnce(
      () => pending,
    );

    currentWorker().onModuleInit();

    await vi.advanceTimersByTimeAsync(1000);

    expect(runOnce).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(
      120_000,
    );

    expect(runOnce).toHaveBeenCalledTimes(1);

    finishPass?.();

    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(
      59_999,
    );

    expect(runOnce).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(runOnce).toHaveBeenCalledTimes(2);
  });

  it('schedules another pass after a processing failure', async () => {
    enableWorker();

    runOnce.mockRejectedValueOnce(
      new Error(
        'Synthetic processing failure.',
      ),
    );

    currentWorker().onModuleInit();

    await vi.advanceTimersByTimeAsync(1000);

    expect(runOnce).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(
      60_000,
    );

    expect(runOnce).toHaveBeenCalledTimes(2);
  });

  it('cancels startup processing when stopped before the first pass', async () => {
    enableWorker();

    const instance = currentWorker();

    instance.onModuleInit();

    await instance.onModuleDestroy();

    await vi.advanceTimersByTimeAsync(
      120_000,
    );

    expect(runOnce).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits for an active pass during shutdown and does not schedule another', async () => {
    enableWorker();

    const pending = deferredPass();

    runOnce.mockImplementationOnce(
      () => pending,
    );

    const instance = currentWorker();

    instance.onModuleInit();

    await vi.advanceTimersByTimeAsync(1000);

    let shutdownFinished = false;

    const shutdown =
      instance.onModuleDestroy().then(() => {
        shutdownFinished = true;
      });

    await Promise.resolve();

    expect(shutdownFinished).toBe(false);

    finishPass?.();

    await shutdown;

    expect(shutdownFinished).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(
      120_000,
    );

    expect(runOnce).toHaveBeenCalledTimes(1);
  });

  it('clears an already scheduled follow-up pass during shutdown', async () => {
    enableWorker();

    const instance = currentWorker();

    instance.onModuleInit();

    await vi.advanceTimersByTimeAsync(1000);

    expect(runOnce).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    await instance.onModuleDestroy();

    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(
      120_000,
    );

    expect(runOnce).toHaveBeenCalledTimes(1);
  });
});