import type { z } from 'zod';
import { fetchWithTimeout, handleResponse, APIError } from './fetch-utils';
import {
  JobResponseSchema,
  JobListSchema,
  DatasetListSchema,
  DatasetCreationSchema,
  ContentPlanEnvelopeSchema,
  CreateDatasetInputSchema,
} from './types';
import type {
  JobResponse,
  QueueSummary,
  Dataset,
  CreateDatasetInput,
  CreateDatasetResponse,
  ContentPlanEnvelope,
} from './types';
import { QueueSummarySchema, JobSpec, ContentPlan, DatasetSpec, LoRAConfig } from './core-schemas';

type QueryValue = string | number | boolean | undefined;

export interface ListJobsParams {
  status?: string;
  type?: string;
  take?: number;
  skip?: number;
}

interface RequestConfig<T> {
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, QueryValue>;
  schema?: z.ZodType<T>;
  timeoutMs?: number;
}

export interface UpdateJobInput {
  status?: string;
  result?: unknown;
  costTok?: number;
}

export class InfluencerAIClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(normalizedPath, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  private parseWithSchema<T>(schema: z.ZodType<T>, data: unknown, url: string, method: string) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new APIError('Invalid response shape', { status: 502, body: data, url, method });
    }
    return parsed.data;
  }

  private async request<T>({
    path,
    method = 'GET',
    body,
    headers,
    query,
    schema,
    timeoutMs,
  }: RequestConfig<T>): Promise<T> {
    const url = this.buildUrl(path, query);
    const finalHeaders: Record<string, string> = { ...(headers || {}) };
    let finalBody: BodyInit | undefined;

    if (body !== undefined) {
      if (
        typeof body === 'string' ||
        body instanceof ArrayBuffer ||
        ArrayBuffer.isView(body) ||
        body instanceof Blob ||
        body instanceof FormData ||
        body instanceof URLSearchParams
      ) {
        finalBody = body as BodyInit;
      } else {
        finalBody = JSON.stringify(body);
        if (!finalHeaders['Content-Type']) {
          finalHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await fetchWithTimeout(
      url,
      {
        method,
        headers: Object.keys(finalHeaders).length > 0 ? finalHeaders : undefined,
        body: finalBody,
      },
      timeoutMs
    );
    const data = await handleResponse<unknown>(response);
    if (!schema) {
      return data as T;
    }
    return this.parseWithSchema(schema, data, url, method);
  }

  async createJob(spec: JobSpec): Promise<JobResponse> {
    return this.request({ path: '/jobs', method: 'POST', body: spec, schema: JobResponseSchema });
  }

  async getJob(id: string) {
    return this.request({ path: `/jobs/${id}`, schema: JobResponseSchema });
  }

  async listJobs(params: ListJobsParams = {}) {
    const query: Record<string, QueryValue> = {
      status: params.status,
      type: params.type,
      take: params.take,
      skip: params.skip,
    };
    return this.request({ path: '/jobs', query, schema: JobListSchema });
  }

  async updateJob(id: string, update: UpdateJobInput) {
    return this.request({
      path: `/jobs/${id}`,
      method: 'PATCH',
      body: update,
      schema: JobResponseSchema,
    });
  }

  async getQueuesSummary(): Promise<QueueSummary> {
    return this.request({ path: '/queues/summary', schema: QueueSummarySchema });
  }

  async createContentPlan(plan: Omit<ContentPlan, 'createdAt'>) {
    return this.request({
      path: '/content-plans',
      method: 'POST',
      body: plan,
      schema: ContentPlanEnvelopeSchema,
    });
  }

  async health() {
    return this.request({ path: '/health' });
  }

  async listDatasets(): Promise<Dataset[]> {
    return this.request({ path: '/datasets', schema: DatasetListSchema });
  }

  async createDataset(input: CreateDatasetInput): Promise<CreateDatasetResponse> {
    const parsedInput = CreateDatasetInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new APIError('Invalid dataset payload', {
        status: 400,
        body: parsedInput.error.flatten(),
      });
    }
    return this.request({
      path: '/datasets',
      method: 'POST',
      body: parsedInput.data,
      schema: DatasetCreationSchema,
    });
  }

  async getContentPlan(id: string): Promise<ContentPlanEnvelope> {
    return this.request({ path: `/content-plans/${id}`, schema: ContentPlanEnvelopeSchema });
  }
}

export type { JobSpec, ContentPlan, DatasetSpec, LoRAConfig } from './core-schemas';
export type {
  JobResponse,
  QueueSummary,
  Dataset,
  CreateDatasetInput,
  CreateDatasetResponse,
  ContentPlanEnvelope,
} from './types';
export { APIError as InfluencerAIAPIError } from './fetch-utils';
