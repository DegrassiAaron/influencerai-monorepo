/**
 * @file JobProgress.tsx
 * @description Real-time progress display component for training jobs
 *
 * Displays progress bar, current stage, step counter, and live training logs.
 * Supports auto-scrolling logs viewer with toggle control.
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * Job result structure from API
 */
interface JobResult {
  estimatedTimeRemaining?: number;
  currentEpoch?: number;
  totalEpochs?: number;
  logs?: string[];
  metrics?: {
    finalLoss?: number;
    trainingTime?: number;
  };
}

/**
 * Job type matching API response
 */
interface Job {
  id: string;
  name: string;
  status: string;
  progress: number;
  result: JobResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobProgressProps {
  /** Job data with progress information */
  job: Job;

  /** Whether to show training logs (default: true for running, false for completed) */
  showLogs?: boolean;

  /** Maximum number of log lines to display (default: 100) */
  maxLogLines?: number;
}

/**
 * Format seconds into human-readable duration
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * JobProgress Component
 *
 * Displays real-time training progress with progress bar, stage info, epoch counter,
 * estimated time remaining, and auto-scrolling logs viewer.
 */
export function JobProgress({ job, showLogs = true, maxLogLines = 100 }: JobProgressProps) {
  const [autoScroll, setAutoScroll] = React.useState(true);
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const logsContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  React.useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job.result?.logs, autoScroll]);

  // Disable auto-scroll when user manually scrolls up
  React.useEffect(() => {
    const container = logsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      if (!isAtBottom && autoScroll) {
        setAutoScroll(false);
      } else if (isAtBottom && !autoScroll) {
        setAutoScroll(true);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [autoScroll]);

  const logs = job.result?.logs || [];
  const displayLogs = logs.slice(-maxLogLines);

  return (
    <div className="space-y-6">
      {/* Progress Bar Card */}
      <Card>
        <CardHeader>
          <CardTitle>Training Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">{job.progress}%</span>
            </div>
            <Progress
              value={job.progress}
              aria-label="Training progress"
              aria-valuenow={job.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Epoch Counter */}
          {job.result?.currentEpoch !== undefined && job.result?.totalEpochs !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Epoch</span>
              <span className="font-medium">
                Epoch {job.result.currentEpoch}/{job.result.totalEpochs}
              </span>
            </div>
          )}

          {/* Estimated Time Remaining */}
          {job.result?.estimatedTimeRemaining !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Time Remaining</span>
              <span className="font-medium">
                {formatDuration(job.result.estimatedTimeRemaining)}
              </span>
            </div>
          )}

          {/* Training Metrics (for completed jobs) */}
          {job.result?.metrics?.finalLoss !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Final Loss</span>
              <span className="font-medium">{job.result.metrics.finalLoss}</span>
            </div>
          )}

          {job.result?.metrics?.trainingTime !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Training Time</span>
              <span className="font-medium">
                {formatDuration(job.result.metrics.trainingTime)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Logs Card */}
      {showLogs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Logs</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={(checked) => setAutoScroll(checked === true)}
                />
                <Label
                  htmlFor="auto-scroll"
                  className="text-sm font-normal cursor-pointer"
                >
                  Auto-scroll
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={logsContainerRef}
              className="h-64 overflow-y-auto rounded-md bg-muted p-4 font-mono text-xs"
            >
              {displayLogs.map((log, index) => (
                <div key={index} className="mb-1 text-muted-foreground">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
            {logs.length > maxLogLines && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing last {maxLogLines} of {logs.length} log lines
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
