import { z } from 'zod';

/**
 * Zod validation schemas for LoRA Config API
 *
 * These schemas validate incoming requests and provide type-safe DTOs.
 * All numeric parameters follow kohya_ss training script conventions.
 */

/**
 * Schema for creating a new LoRA configuration.
 *
 * Validation rules:
 * - name: Required, 1-100 characters, will be checked for uniqueness per tenant
 * - modelName: Required, base model identifier (e.g., "sd15", "sdxl")
 * - epochs: 1-1000, default 10
 * - learningRate: 0.000001-1, default 0.0001
 * - batchSize: 1-64, default 1
 * - resolution: 128-2048, default 512
 * - networkDim: 1-512, default 32 (LoRA rank)
 * - networkAlpha: 1-512, default 16 (scaling factor)
 * - outputPath: Optional custom output directory
 * - meta: Optional JSON metadata for custom training params
 * - isDefault: Whether this is the default config for the tenant
 */
export const CreateLoraConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  modelName: z
    .string()
    .min(1, 'Model name is required')
    .max(50, 'Model name must be at most 50 characters')
    .trim(),
  epochs: z
    .number()
    .int('Epochs must be an integer')
    .min(1, 'Epochs must be at least 1')
    .max(1000, 'Epochs must be at most 1000')
    .default(10)
    .optional(),
  learningRate: z
    .number()
    .min(0.000001, 'Learning rate must be at least 0.000001')
    .max(1, 'Learning rate must be at most 1')
    .default(0.0001)
    .optional(),
  batchSize: z
    .number()
    .int('Batch size must be an integer')
    .min(1, 'Batch size must be at least 1')
    .max(64, 'Batch size must be at most 64')
    .default(1)
    .optional(),
  resolution: z
    .number()
    .int('Resolution must be an integer')
    .min(128, 'Resolution must be at least 128')
    .max(2048, 'Resolution must be at most 2048')
    .default(512)
    .optional(),
  networkDim: z
    .number()
    .int('Network dimension must be an integer')
    .min(1, 'Network dimension must be at least 1')
    .max(512, 'Network dimension must be at most 512')
    .default(32)
    .optional(),
  networkAlpha: z
    .number()
    .int('Network alpha must be an integer')
    .min(1, 'Network alpha must be at least 1')
    .max(512, 'Network alpha must be at most 512')
    .default(16)
    .optional(),
  outputPath: z
    .string()
    .max(255, 'Output path must be at most 255 characters')
    .optional(),
  meta: z
    .record(z.unknown())
    .default({})
    .optional(),
  isDefault: z
    .boolean()
    .default(false)
    .optional(),
});

/**
 * Schema for updating an existing LoRA configuration.
 * All fields are optional (partial update).
 */
export const UpdateLoraConfigSchema = CreateLoraConfigSchema.partial();

/**
 * Schema for query parameters when listing LoRA configurations.
 *
 * Supports:
 * - Filtering by isDefault flag and modelName
 * - Pagination with take/skip
 * - Sorting by createdAt, updatedAt, or name
 */
export const ListLoraConfigsQuerySchema = z.object({
  isDefault: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  modelName: z
    .string()
    .max(50)
    .optional(),
  take: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int()
        .min(1, 'Take must be at least 1')
        .max(100, 'Take must be at most 100')
        .default(20)
    )
    .optional()
    .default('20'),
  skip: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int()
        .min(0, 'Skip must be at least 0')
        .default(0)
    )
    .optional()
    .default('0'),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'name'])
    .default('createdAt')
    .optional(),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc')
    .optional(),
});

/**
 * Schema for validating the ID path parameter.
 */
export const GetLoraConfigParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Type exports for use in service and controller layers
export type CreateLoraConfigInput = z.infer<typeof CreateLoraConfigSchema>;
export type UpdateLoraConfigInput = z.infer<typeof UpdateLoraConfigSchema>;
export type ListLoraConfigsQuery = z.infer<typeof ListLoraConfigsQuerySchema>;
export type GetLoraConfigParam = z.infer<typeof GetLoraConfigParamSchema>;
