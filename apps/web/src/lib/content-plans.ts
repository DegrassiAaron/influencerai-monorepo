import { ContentPlanSchema } from '@influencerai/core-schemas';
import { z } from 'zod';

import { apiGet, apiPatch, apiPost } from './api';

const PlatformEnum = z.enum(['instagram', 'tiktok', 'youtube']);

const CreateContentPlanInputSchema = z.object({
  influencerId: z.string().min(1, 'Influencer ID is required'),
  theme: z.string().min(1, 'Theme is required'),
  targetPlatforms: z.array(PlatformEnum).min(1, 'Select at least one platform'),
});

const ApprovalStatusSchema = z.enum(['approved', 'rejected']);

const ContentPlanWithApprovalSchema = ContentPlanSchema.extend({
  approvalStatus: ApprovalStatusSchema.optional(),
});

const ContentPlanJobSchema = z.object({
  id: z.string(),
  plan: ContentPlanWithApprovalSchema,
});

const UpdateContentPlanApprovalSchema = z.object({
  id: z.string().min(1),
  plan: ContentPlanWithApprovalSchema,
  approvalStatus: ApprovalStatusSchema,
});

const ListContentPlansParamsSchema = z.object({
  influencerId: z.string().min(1).optional(),
  take: z.number().int().min(1).max(100).optional(),
  skip: z.number().int().min(0).optional(),
});

const ContentPlanJobListSchema = z.array(ContentPlanJobSchema);

export type CreateContentPlanInput = z.infer<typeof CreateContentPlanInputSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type ContentPlanJob = z.infer<typeof ContentPlanJobSchema>;
export type UpdateContentPlanApprovalInput = z.infer<typeof UpdateContentPlanApprovalSchema>;
export type ListContentPlansParams = z.infer<typeof ListContentPlansParamsSchema>;

export async function createContentPlan(input: CreateContentPlanInput): Promise<ContentPlanJob> {
  const payload = CreateContentPlanInputSchema.parse(input);
  const response = await apiPost<CreateContentPlanInput, unknown>('/content-plans', payload);
  const parsed = ContentPlanJobSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('Invalid response format from content plan API');
  }
  return parsed.data;
}

export async function updateContentPlanApproval(input: UpdateContentPlanApprovalInput) {
  const payload = UpdateContentPlanApprovalSchema.parse(input);
  const planWithStatus = { ...payload.plan, approvalStatus: payload.approvalStatus };
  await apiPatch(`/jobs/${payload.id}`, { result: planWithStatus });
  return { ...payload, plan: planWithStatus };
}

export async function listContentPlans(params: ListContentPlansParams = {}) {
  const parsed = ListContentPlansParamsSchema.parse(params ?? {});
  const searchParams = new URLSearchParams();
  if (parsed.influencerId) {
    searchParams.set('influencerId', parsed.influencerId);
  }
  if (typeof parsed.take === 'number') {
    searchParams.set('take', String(parsed.take));
  }
  if (typeof parsed.skip === 'number') {
    searchParams.set('skip', String(parsed.skip));
  }
  const queryString = searchParams.toString();
  const path = queryString ? `/content-plans?${queryString}` : '/content-plans';
  const response = await apiGet<unknown>(path);
  const parsedResponse = ContentPlanJobListSchema.safeParse(response);
  if (!parsedResponse.success) {
    throw new Error('Invalid response format while listing content plans');
  }
  return parsedResponse.data;
}
