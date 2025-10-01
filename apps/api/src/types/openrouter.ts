import { z } from 'zod';

export const OpenRouterMessageSchema = z.object({
  role: z.string().optional(),
  content: z.string(),
});

export const OpenRouterChoiceSchema = z.object({
  index: z.number().optional(),
  message: OpenRouterMessageSchema,
  finish_reason: z.string().optional(),
});

export const OpenRouterUsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
}).partial();

export const OpenRouterResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(OpenRouterChoiceSchema),
  usage: OpenRouterUsageSchema.optional(),
});

export type OpenRouterResponse = z.infer<typeof OpenRouterResponseSchema>;
