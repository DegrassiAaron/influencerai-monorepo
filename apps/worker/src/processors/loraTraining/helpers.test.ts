import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleProgress } from './helpers';
import type { LoraTrainingProcessorDeps, ProgressState } from './types';

describe('scheduleProgress', () => {
  let patchJobStatus: ReturnType<typeof vi.fn>;
  let logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let deps: LoraTrainingProcessorDeps;
  let state: ProgressState;
  let nowValue: number;

  beforeEach(() => {
    vi.useFakeTimers();
    patchJobStatus = vi.fn().mockResolvedValue(undefined);
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    nowValue = 0;
    deps = {
      logger,
      patchJobStatus,
      s3: {
        getClient: () => null,
        putBinaryObject: vi.fn(),
        getSignedGetUrl: vi.fn(),
      },
      now: () => nowValue,
    } as unknown as LoraTrainingProcessorDeps;
    state = { lastUpdate: 0, logs: [] };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throttles updates, flushes logs and updates lastUpdate with current time', async () => {
    scheduleProgress({ stage: 'running', message: 'step 1' }, 'job-1', deps, state);

    expect(patchJobStatus).not.toHaveBeenCalled();

    nowValue = 600;
    vi.advanceTimersByTime(600);
    await vi.runAllTimersAsync();

    expect(patchJobStatus).toHaveBeenCalledTimes(1);
    let progressPayload = patchJobStatus.mock.calls[0]?.[1]?.result?.progress;
    expect(progressPayload.logs).toEqual(['step 1']);
    expect(state.lastUpdate).toBe(600);

    patchJobStatus.mockClear();

    nowValue = 800;
    scheduleProgress({ stage: 'running', message: 'step 2' }, 'job-1', deps, state);
    expect(patchJobStatus).not.toHaveBeenCalled();

    nowValue = 1800;
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();

    expect(patchJobStatus).toHaveBeenCalledTimes(1);
    progressPayload = patchJobStatus.mock.calls[0]?.[1]?.result?.progress;
    expect(progressPayload.logs).toEqual(['step 1', 'step 2']);
    expect(state.lastUpdate).toBe(1800);
    expect(state.timer).toBeNull();
  });
});
