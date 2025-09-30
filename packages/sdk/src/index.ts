import type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig } from '@influencerai/core-schemas';

export class InfluencerAIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async createJob(spec: JobSpec) {
    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    });
    return response.json();
  }

  async getJob(id: string) {
    const response = await fetch(`${this.baseUrl}/jobs/${id}`);
    return response.json();
  }

  async listJobs() {
    const response = await fetch(`${this.baseUrl}/jobs`);
    return response.json();
  }

  async createContentPlan(plan: Omit<ContentPlan, 'createdAt'>) {
    const response = await fetch(`${this.baseUrl}/content-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    return response.json();
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

export type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig };