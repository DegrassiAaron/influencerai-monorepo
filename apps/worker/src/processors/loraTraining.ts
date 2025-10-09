import { spawn as defaultSpawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import type { Processor } from 'bullmq';
import {
  collectLogs,
  coercePayload,
  buildKohyaCommand,
  DEFAULT_TIMEOUT_MS,
  parseProgressFromLine,
  resolveConfig,
  resolveDataset,
  scheduleProgress,
  uploadSafetensors,
  waitForProcess,
} from './loraTraining/helpers';
import type {
  LoraTrainingJobData,
  LoraTrainingResult,
  LoraTrainingProcessorDeps,
  ProgressState,
} from './loraTraining/types';

export { type LoraTrainingJobData, type LoraTrainingResult } from './loraTraining/types';

export function createLoraTrainingProcessor(
  deps: LoraTrainingProcessorDeps
): Processor<LoraTrainingJobData, LoraTrainingResult, 'lora-training'> {
  const spawn = deps.spawn ?? defaultSpawn;

  return async (job) => {
    deps.logger.info({ id: job.id, data: job.data }, 'Processing LoRA training job');
    const jobData = job.data ?? {};
    const jobId = typeof jobData.jobId === 'string' ? jobData.jobId : undefined;
    const payload = coercePayload(jobData.payload as Record<string, unknown> | undefined);

    if (jobId) {
      await deps.patchJobStatus(jobId, { status: 'running', result: { progress: { stage: 'initializing' } } });
    }

    const progressState: ProgressState = { lastUpdate: deps.now ? deps.now() : Date.now(), logs: [] };

    try {
      scheduleProgress({ stage: 'fetching-dataset', message: 'Resolving dataset path' }, jobId, deps, progressState);
      const dataset = await resolveDataset(payload, deps);

      scheduleProgress({ stage: 'fetching-dataset', message: `Dataset resolved at ${dataset.path}` }, jobId, deps, progressState);
      const config = await resolveConfig(payload, dataset, deps);

      const resolvedOutputDir = path.resolve(
        config.outputPath || payload.outputDir || `data/loras/${payload.trainingName || jobId || Date.now()}`
      );
      if (!existsSync(resolvedOutputDir)) {
        await fs.mkdir(resolvedOutputDir, { recursive: true });
      }

      const command = buildKohyaCommand(payload, dataset, config, resolvedOutputDir);
      deps.logger.info(
        {
          jobId,
          command: command.command,
          args: command.args,
          options: { cwd: command.options.cwd },
        },
        'Launching kohya_ss process'
      );

      const child = spawn(command.command, command.args, command.options);
      const buffers: string[] = [];

      const handleLine = (source: 'stdout' | 'stderr', chunk: Buffer | string) => {
        const data = chunk.toString();
        const lines = data.split(/\r?\n/);
        for (const line of lines) {
          if (!line) continue;
          const progress = parseProgressFromLine(line);
          const message = line.trim();
          buffers.push(message);
          deps.logger.info({ jobId, source, line: message }, 'kohya_ss output');
          scheduleProgress(
            {
              stage: 'running',
              message,
              source,
              ...progress,
            },
            jobId,
            deps,
            progressState
          );
        }
      };

      child.stdout?.on('data', (chunk) => handleLine('stdout', chunk));
      child.stderr?.on('data', (chunk) => handleLine('stderr', chunk));

      const timeoutMs = payload.timeoutMs || config.timeoutMs || DEFAULT_TIMEOUT_MS;
      const exitCode = await waitForProcess(child, timeoutMs, () => {
        deps.logger.warn({ jobId }, 'LoRA training timed out, attempting graceful shutdown');
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000);
        scheduleProgress({ stage: 'failed', message: 'LoRA training timed out' }, jobId, deps, progressState);
      });

      if (exitCode !== 0) {
        throw new Error(`kohya_ss exited with code ${exitCode}`);
      }

      scheduleProgress({ stage: 'uploading', message: 'Uploading artifacts to storage' }, jobId, deps, progressState);
      const s3Prefix = payload.s3Prefix || `lora-training/${jobId || Date.now()}/`;
      const artifacts = await uploadSafetensors(resolvedOutputDir, deps.s3, s3Prefix);

      if (jobId) {
        await deps.patchJobStatus(jobId, {
          status: 'succeeded',
          result: {
            progress: { stage: 'completed', percent: 100, message: 'Training completed', logs: collectLogs(buffers) },
            outputDir: resolvedOutputDir,
            artifacts,
          },
        });
      }

      return {
        success: true,
        message: 'Training completed',
        outputDir: resolvedOutputDir,
        artifacts,
        logs: collectLogs(buffers),
      } satisfies LoraTrainingResult;
    } catch (err) {
      deps.logger.error({ err, jobId }, 'LoRA training job failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (jobId) {
        await deps.patchJobStatus(jobId, {
          status: 'failed',
          result: {
            message,
            progress: { stage: 'failed', message },
          },
        });
      }
      throw err;
    } finally {
      if (progressState.timer) {
        clearTimeout(progressState.timer);
      }
    }
  };
}
