import type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig } from '@influencerai/core-schemas';
import { fetchWithTimeout, handleResponse } from './fetch-utils';

export class InfluencerAIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async createJob(spec: JobSpec) {
    const response = await fetchWithTimeout(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    });
    return handleResponse(response);
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
export { APIError as InfluencerAIAPIError } from './fetch-utils';
