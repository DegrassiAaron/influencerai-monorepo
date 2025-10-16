import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFailureAlerter } from './alerts';

describe('createFailureAlerter', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when webhook is not configured', async () => {
    const fetchImpl = vi.fn();
    const alerter = createFailureAlerter({
      logger,
      webhookUrl: undefined,
      threshold: 3,
      fetchImpl,
    });

    await alerter.handleFailure('content-generation', { id: 'job-1' } as any, new Error('boom'));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends alert when failures reach threshold and resets counter', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const alerter = createFailureAlerter({
      logger,
      webhookUrl: 'https://hooks.local/webhook',
      threshold: 2,
      fetchImpl,
    });

    await alerter.handleFailure('video-generation', { id: 'job-1' } as any, new Error('oops'));
    expect(fetchImpl).not.toHaveBeenCalled();

    await alerter.handleFailure(
      'video-generation',
      { id: 'job-2' } as any,
      new Error('oops again')
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://hooks.local/webhook',
      expect.objectContaining({
        method: 'POST',
      })
    );

    fetchImpl.mockClear();
    await alerter.handleFailure('video-generation', { id: 'job-3' } as any, new Error('another'));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('resets counter when resetFailures is invoked', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const alerter = createFailureAlerter({
      logger,
      webhookUrl: 'https://hooks.local/webhook',
      threshold: 2,
      fetchImpl,
    });

    await alerter.handleFailure('content-generation', { id: 'job-1' } as any, new Error('fail'));
    alerter.resetFailures('content-generation');
    await alerter.handleFailure(
      'content-generation',
      { id: 'job-2' } as any,
      new Error('fail again')
    );

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('logs a warning when webhook call fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const alerter = createFailureAlerter({
      logger,
      webhookUrl: 'https://hooks.local/webhook',
      threshold: 1,
      fetchImpl,
    });

    await alerter.handleFailure('lora-training', { id: 'job-1' } as any, new Error('fail'));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ queueName: 'lora-training', err: expect.any(Error) }),
      'Failed to deliver failure alert'
    );
  });
});
