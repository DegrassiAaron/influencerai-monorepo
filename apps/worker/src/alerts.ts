import type { WorkerLogger } from './index';

type FetchLike = (url: string, init?: Record<string, unknown>) => Promise<unknown>;

type FailureAlerterOptions = {
  logger: WorkerLogger;
  webhookUrl?: string;
  threshold: number;
  fetchImpl: FetchLike;
};

type FailureJob = { id?: string; data?: unknown } | null | undefined;

export function createFailureAlerter(options: FailureAlerterOptions) {
  const { logger, webhookUrl, threshold, fetchImpl } = options;
  const consecutiveFailures = new Map<string, number>();
  const minimumThreshold = Number.isFinite(threshold) && threshold > 0 ? Math.floor(threshold) : 1;

  async function handleFailure(queueName: string, job: FailureJob, err: unknown) {
    if (!webhookUrl) {
      return;
    }

    const current = (consecutiveFailures.get(queueName) ?? 0) + 1;
    consecutiveFailures.set(queueName, current);

    if (current < minimumThreshold) {
      return;
    }

    consecutiveFailures.set(queueName, 0);

    const jobId = (job as any)?.id ?? (job as any)?.data?.jobId;
    const message = err instanceof Error ? err.message : String(err ?? 'unknown error');
    const payload = {
      queue: queueName,
      jobId: jobId ?? null,
      consecutiveFailures: current,
      message,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      logger.warn({ err: error, queueName, payload }, 'Failed to deliver failure alert');
    }
  }

  function resetFailures(queueName: string) {
    consecutiveFailures.set(queueName, 0);
  }

  return { handleFailure, resetFailures };
}
