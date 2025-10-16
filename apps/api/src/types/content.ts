import { z } from 'zod';

export const ContentPlanPostSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
});

export const ContentPlanDataSchema = z.array(ContentPlanPostSchema);

export type ContentPlanData = z.infer<typeof ContentPlanDataSchema>;
