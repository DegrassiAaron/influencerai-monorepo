import { z } from 'zod';

export const CreateContentPlanSchema = z.object({
  influencerId: z.string().min(1),
  theme: z.string().min(1),
  targetPlatforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])).default(['instagram']).optional(),
});

export type CreateContentPlanDto = z.infer<typeof CreateContentPlanSchema>;

// Response shape aligns with ContentPlan but with server-generated createdAt
export const ContentPlanResponseSchema = z.object({
  influencerId: z.string(),
  theme: z.string(),
  targetPlatforms: z.array(z.enum(['instagram', 'tiktok', 'youtube'])),
  posts: z.array(
    z.object({ caption: z.string(), hashtags: z.array(z.string()) })
  ),
  createdAt: z.string().datetime(),
});
export type ContentPlanResponse = z.infer<typeof ContentPlanResponseSchema>;

export const ListPlansQuerySchema = z.object({
  influencerId: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).default(20).optional(),
  skip: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListPlansQuery = z.infer<typeof ListPlansQuerySchema>;
