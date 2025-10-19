import type { z } from 'zod';
import { fetchWithTimeout, handleResponse, APIError } from './fetch-utils';
import {
  JobResponseSchema,
  JobListSchema,
  DatasetSchema,
  DatasetListSchema,
  DatasetCreationSchema,
  ContentPlanEnvelopeSchema,
  CreateDatasetInputSchema,
  LoraConfigSchema,
  LoraConfigListSchema,
  CreateLoraConfigInputSchema,
  UpdateLoraConfigInputSchema,
} from './types';
import type {
  JobResponse,
  QueueSummary,
  Dataset,
  CreateDatasetInput,
  CreateDatasetResponse,
  ContentPlanEnvelope,
  ListDatasetsParams,
  LoraConfig,
  ListLoraConfigsParams,
  CreateLoraConfigInput,
  UpdateLoraConfigInput,
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

  /**
   * List datasets with optional filtering and pagination
   *
   * @param params - Query parameters for filtering, pagination, and sorting
   * @returns Array of datasets matching the criteria
   *
   * @example
   * ```typescript
   * // List all datasets
   * const datasets = await client.listDatasets();
   *
   * // List with pagination and filters
   * const readyDatasets = await client.listDatasets({
   *   status: 'ready',
   *   take: 20,
   *   skip: 0,
   *   sortBy: 'createdAt',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async listDatasets(params: ListDatasetsParams = {}): Promise<Dataset[]> {
    const query: Record<string, QueryValue> = {
      status: params.status,
      kind: params.kind,
      take: params.take,
      skip: params.skip,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    };
    return this.request({ path: '/datasets', query, schema: DatasetListSchema });
  }

  /**
   * Get a single dataset by ID
   *
   * @param id - Dataset ID
   * @returns Dataset record
   * @throws APIError if dataset is not found or unauthorized
   *
   * @example
   * ```typescript
   * const dataset = await client.getDataset('ds_123');
   * console.log(dataset.status); // 'ready'
   * ```
   */
  async getDataset(id: string): Promise<Dataset> {
    return this.request({ path: `/datasets/${id}`, schema: DatasetSchema });
  }

  /**
   * Delete a dataset by ID
   *
   * @param id - Dataset ID to delete
   * @returns void
   * @throws APIError if dataset is not found or unauthorized
   *
   * @example
   * ```typescript
   * await client.deleteDataset('ds_123');
   * ```
   */
  async deleteDataset(id: string): Promise<void> {
    await this.request({ path: `/datasets/${id}`, method: 'DELETE' });
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

  /**
   * List LoRA configurations with optional filtering and pagination
   *
   * @param params - Query parameters for filtering, pagination, and sorting
   * @returns Array of LoRA configurations matching the criteria
   *
   * @example
   * ```typescript
   * // List all LoRA configs
   * const configs = await client.listLoraConfigs();
   *
   * // List default config only
   * const defaultConfig = await client.listLoraConfigs({ isDefault: true });
   *
   * // List with pagination
   * const configs = await client.listLoraConfigs({
   *   take: 20,
   *   skip: 0,
   *   sortBy: 'createdAt',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async listLoraConfigs(params: ListLoraConfigsParams = {}): Promise<LoraConfig[]> {
    const query: Record<string, QueryValue> = {
      isDefault: params.isDefault,
      modelName: params.modelName,
      take: params.take,
      skip: params.skip,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    };
    return this.request({ path: '/lora-configs', query, schema: LoraConfigListSchema });
  }

  /**
   * Get a single LoRA configuration by ID
   *
   * @param id - LoRA configuration ID
   * @returns LoRA configuration record
   * @throws APIError if configuration is not found or unauthorized
   *
   * @example
   * ```typescript
   * const config = await client.getLoraConfig('lc_123');
   * console.log(config.epochs); // 20
   * ```
   */
  async getLoraConfig(id: string): Promise<LoraConfig> {
    return this.request({ path: `/lora-configs/${id}`, schema: LoraConfigSchema });
  }

  /**
   * Create a new LoRA configuration
   *
   * @param input - LoRA configuration parameters
   * @returns Created LoRA configuration with generated ID
   * @throws APIError if validation fails or name already exists
   *
   * @example
   * ```typescript
   * const config = await client.createLoraConfig({
   *   name: 'My Influencer Style',
   *   modelName: 'sd15',
   *   epochs: 20,
   *   learningRate: 0.0001,
   *   batchSize: 2,
   *   resolution: 512
   * });
   * ```
   */
  async createLoraConfig(input: CreateLoraConfigInput): Promise<LoraConfig> {
    const parsedInput = CreateLoraConfigInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new APIError('Invalid LoRA config payload', {
        status: 400,
        body: parsedInput.error.flatten(),
      });
    }
    return this.request({
      path: '/lora-configs',
      method: 'POST',
      body: parsedInput.data,
      schema: LoraConfigSchema,
    });
  }

  /**
   * Update an existing LoRA configuration
   *
   * @param id - LoRA configuration ID
   * @param input - Fields to update (partial)
   * @returns Updated LoRA configuration
   * @throws APIError if not found, validation fails, or name conflicts
   *
   * @example
   * ```typescript
   * const updated = await client.updateLoraConfig('lc_123', {
   *   epochs: 30,
   *   learningRate: 0.00015
   * });
   * ```
   */
  async updateLoraConfig(id: string, input: UpdateLoraConfigInput): Promise<LoraConfig> {
    const parsedInput = UpdateLoraConfigInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new APIError('Invalid LoRA config update payload', {
        status: 400,
        body: parsedInput.error.flatten(),
      });
    }
    return this.request({
      path: `/lora-configs/${id}`,
      method: 'PATCH',
      body: parsedInput.data,
      schema: LoraConfigSchema,
    });
  }

  /**
   * Delete a LoRA configuration
   *
   * @param id - LoRA configuration ID to delete
   * @returns void
   * @throws APIError if not found, unauthorized, or active jobs exist
   *
   * @example
   * ```typescript
   * await client.deleteLoraConfig('lc_123');
   * ```
   */
  async deleteLoraConfig(id: string): Promise<void> {
    await this.request({ path: `/lora-configs/${id}`, method: 'DELETE' });
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
  ListDatasetsParams,
  LoraConfig,
  ListLoraConfigsParams,
  CreateLoraConfigInput,
  UpdateLoraConfigInput,
} from './types';
export { APIError as InfluencerAIAPIError } from './fetch-utils';
