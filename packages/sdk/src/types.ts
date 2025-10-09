export interface JobResponse {
  id: string;
  type?: string;
  status?: 'pending' | 'running' | 'succeeded' | 'failed' | 'completed' | string;
  payload?: unknown;
  result?: unknown;
  createdAt?: string;
  priority?: number;
  parentJobId?: string;
}

// JobResponse is exported via the `export interface JobResponse` declaration above.

export interface QueueSummary {
  active: number;
  waiting: number;
  failed: number;
}
