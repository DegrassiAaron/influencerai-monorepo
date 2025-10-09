export type ContentPlanStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type ContentPlanPersona = {
  name: string;
  audience: string;
  context: string;
};

export type ContentPlanPost = {
  id: string;
  title: string;
  summary: string;
  callToAction: string;
  formatSuggestion?: string;
};

export type ContentPlan = {
  id: string;
  status: ContentPlanStatus;
  persona: Pick<ContentPlanPersona, "name" | "audience">;
  prompt: string;
  posts: ContentPlanPost[];
};

export type ContentPlanGenerateInput = {
  persona: ContentPlanPersona;
  theme: string;
  tone: string;
  callToAction: string;
  postCount: number;
};

export type UpdateContentPlanStatusInput = {
  planId: string;
  status: Exclude<ContentPlanStatus, "DRAFT">;
};
