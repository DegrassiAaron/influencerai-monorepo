import type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig } from '@influencerai/core-schemas';
import { fetchWithTimeout, handleResponse, APIError } from './fetch-utils';
import type { JobResponse } from './types';

export class InfluencerAIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async createJob(spec: JobSpec): Promise<JobResponse> {
    const response = await fetchWithTimeout(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    });
    const parsed = await handleResponse<JobResponse>(response);
    // Basic runtime validation to fail fast if the server returns an unexpected shape
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as any).id !== 'string') {
      throw new APIError('Invalid job response shape (missing id)', { status: 502, body: parsed });
    }
    return parsed;
  }

  async getJob(id: string) {
    const response = await fetchWithTimeout(`${this.baseUrl}/jobs/${id}`);
    return handleResponse(response);
  }

  async listJobs() {
    const response = await fetchWithTimeout(`${this.baseUrl}/jobs`);
    return handleResponse(response);
  }

  async updateJob(id: string, update: { status?: string; result?: unknown; costTok?: number }) {
    const response = await fetchWithTimeout(`${this.baseUrl}/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    return handleResponse(response);
  }

  async createContentPlan(plan: Omit<ContentPlan, 'createdAt'>) {
    const response = await fetchWithTimeout(`${this.baseUrl}/content-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    return handleResponse(response);
  }

  async health() {
    const response = await fetchWithTimeout(`${this.baseUrl}/health`);
    return handleResponse(response);
  }
}

export type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig };
export type { JobResponse } from './types';
export { APIError as InfluencerAIAPIError } from './fetch-utils';
