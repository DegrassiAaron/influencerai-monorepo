import { z } from 'zod';

// ========================================
// Enums
// ========================================

export const DatasetKindSchema = z.enum(['lora-training', 'reference']);
export type DatasetKind = z.infer<typeof DatasetKindSchema>;

export const DatasetStatusSchema = z.enum([
  'pending',
  'ready',
  'processing',
  'failed',
  'completed',
]);
export type DatasetStatus = z.infer<typeof DatasetStatusSchema>;

export const DatasetSortBySchema = z.enum(['createdAt', 'updatedAt', 'kind', 'status']);
export type DatasetSortBy = z.infer<typeof DatasetSortBySchema>;

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

// ========================================
// Query Schemas
// ========================================

export const ListDatasetsQuerySchema = z.object({
  status: DatasetStatusSchema.optional(),
  kind: DatasetKindSchema.optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(100, 'take must be at most 100')
    .default(20)
    .optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
  sortBy: DatasetSortBySchema.default('createdAt').optional(),
  sortOrder: SortOrderSchema.default('desc').optional(),
});
export type ListDatasetsQuery = z.infer<typeof ListDatasetsQuerySchema>;

export const GetDatasetParamSchema = z.object({
  id: z.string().min(1, 'Dataset ID is required'),
});
export type GetDatasetParam = z.infer<typeof GetDatasetParamSchema>;

// ========================================
// Command Schemas (from existing service)
// ========================================

export const CreateDatasetSchema = z.object({
  kind: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});
export type CreateDatasetDto = z.infer<typeof CreateDatasetSchema>;

export const UpdateDatasetStatusSchema = z.object({
  status: DatasetStatusSchema.or(z.string().min(1)),
});
export type UpdateDatasetStatusDto = z.infer<typeof UpdateDatasetStatusSchema>;
