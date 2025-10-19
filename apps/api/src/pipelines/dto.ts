import { z } from 'zod';

// ========================================
// Enums
// ========================================

export const PipelineStatusSchema = z.enum([
  'STARTED',
  'VALIDATING',
  'TRAINING',
  'TRAINING_COMPLETE',
  'GENERATING_IMAGES',
  'IMAGES_COMPLETE',
  'GENERATING_VIDEOS',
  'VIDEOS_COMPLETE',
  'AGGREGATING',
  'COMPLETED',
  'FAILED',
]);
export type PipelineStatus = z.infer<typeof PipelineStatusSchema>;

export const PipelineSortBySchema = z.enum([
  'createdAt',
  'updatedAt',
  'startedAt',
  'completedAt',
  'status',
]);
export type PipelineSortBy = z.infer<typeof PipelineSortBySchema>;

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// ========================================
// Query Schemas
// ========================================

export const ListPipelinesQuerySchema = z.object({
  status: PipelineStatusSchema.optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(100, 'take must be at most 100')
    .default(20)
    .optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
  sortBy: PipelineSortBySchema.default('startedAt').optional(),
  sortOrder: SortOrderSchema.default('desc').optional(),
});
export type ListPipelinesQuery = z.infer<typeof ListPipelinesQuerySchema>;

export const GetPipelineParamSchema = z.object({
  executionId: z.string().min(1, 'Execution ID is required'),
});
export type GetPipelineParam = z.infer<typeof GetPipelineParamSchema>;

// ========================================
// Command Schemas
// ========================================

/**
 * Schema for creating a new pipeline execution
 * Used by n8n webhook to initialize pipeline tracking
 */
export const CreatePipelineExecutionSchema = z.object({
  executionId: z
    .string()
    .min(1, 'Execution ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Execution ID must be alphanumeric with hyphens/underscores'),
  workflowId: z
    .string()
    .min(1, 'Workflow ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Workflow ID must be alphanumeric with hyphens/underscores'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  payload: z.record(z.unknown())
    .describe('Original webhook payload')
    .refine(
      (val) => {
        // DoS Protection: Limit payload size to prevent memory exhaustion attacks
        // Stringify to check actual JSON size that will be stored in database
        const jsonStr = JSON.stringify(val);
        const sizeKB = Buffer.byteLength(jsonStr, 'utf8') / 1024;
        return sizeKB <= 100;
      },
      { message: 'Payload exceeds 100KB limit' }
    ),
  totalStages: z.number().int().min(1).max(20).default(6).optional(),
});
export type CreatePipelineExecutionDto = z.infer<typeof CreatePipelineExecutionSchema>;

/**
 * Schema for updating pipeline progress
 * Used by n8n workflow nodes to update state after each stage
 */
export const UpdatePipelineProgressSchema = z.object({
  status: PipelineStatusSchema.optional(),
  currentStage: z.string().min(1).max(100).optional(),
  stagesCompleted: z.number().int().min(0).max(20).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  trainingJobId: z.string().optional(),
  imageJobIds: z.array(z.string()).optional(),
  videoJobIds: z.array(z.string()).optional(),
  assetIds: z.array(z.string()).optional(),
  loraPath: z.string().optional(),
  totalCostTok: z.number().int().min(0).optional(),
  completedAt: z.coerce.date().optional(),
  errorMessage: z.string().max(1000).optional(),
  errorStage: z.string().max(100).optional(),
});
export type UpdatePipelineProgressDto = z.infer<typeof UpdatePipelineProgressSchema>;

/**
 * Schema for n8n webhook payload validation
 * This is what the n8n webhook receives from external triggers
 */
export const StartPipelinePayloadSchema = z.object({
  datasetId: z
    .string()
    .min(1, 'Dataset ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Dataset ID must be alphanumeric with hyphens/underscores'),
  trainingName: z
    .string()
    .min(1, 'Training name is required')
    .max(100, 'Training name must be at most 100 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Training name must contain only letters, numbers, hyphens, and underscores'
    ),
  influencerId: z.string().min(1, 'Influencer ID is required'),
  testPrompts: z
    .array(z.string().min(1, 'Prompt cannot be empty').max(1000, 'Prompt too long'))
    .min(1, 'At least 1 test prompt is required')
    .max(10, 'Maximum 10 test prompts allowed'),
  generateVideo: z.boolean().default(false).optional(),
  videoConfig: z
    .object({
      durationSec: z.number().int().min(1).max(10).default(3).optional(),
      fps: z.number().int().min(12).max(60).default(24).optional(),
    })
    .optional(),
  dryRun: z.boolean().default(false).optional(),
  notificationChannels: z.array(z.enum(['webhook', 'slack', 'email'])).default(['webhook']).optional(),
  priority: z.number().int().min(1).max(10).default(5).optional(),
});
export type StartPipelinePayload = z.infer<typeof StartPipelinePayloadSchema>;
