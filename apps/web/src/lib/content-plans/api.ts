import { apiPatch, apiPost } from '../api';
import { buildContentPlanPrompt } from './prompt';
import { ContentPlan, ContentPlanGenerateInput, UpdateContentPlanStatusInput } from './types';

type CreateContentPlanRequest = ContentPlanGenerateInput & { prompt: string };

type UpdateContentPlanStatusRequest = {
  status: UpdateContentPlanStatusInput['status'];
};

export async function createContentPlan(input: ContentPlanGenerateInput): Promise<ContentPlan> {
  const payload: CreateContentPlanRequest = {
    ...input,
    prompt: buildContentPlanPrompt(input),
  };

  return apiPost<CreateContentPlanRequest, ContentPlan>('/content-plans', payload);
}

export async function updateContentPlanStatus({
  planId,
  status,
}: UpdateContentPlanStatusInput): Promise<ContentPlan> {
  return apiPatch<UpdateContentPlanStatusRequest, ContentPlan>(`/content-plans/${planId}/status`, {
    status,
  });
}
