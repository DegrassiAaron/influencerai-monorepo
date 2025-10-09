import React from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ContentPlanWizard } from "../components/content-plans/ContentPlanWizard";
import type {
  ContentPlanJob,
  CreateContentPlanInput,
  UpdateContentPlanApprovalInput,
} from "../lib/content-plans";

const { createContentPlan, updateContentPlanApproval } = vi.hoisted(() => ({
  createContentPlan: vi.fn<
    [CreateContentPlanInput],
    Promise<ContentPlanJob>
  >(),
  updateContentPlanApproval: vi.fn<
    [UpdateContentPlanApprovalInput],
    Promise<unknown>
  >(),
})) as {
  createContentPlan: Mock<[CreateContentPlanInput], Promise<ContentPlanJob>>;
  updateContentPlanApproval: Mock<[UpdateContentPlanApprovalInput], Promise<unknown>>;
};

vi.mock("../lib/content-plans", () => ({
  createContentPlan,
  updateContentPlanApproval,
}));

function renderWizard() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ContentPlanWizard />
    </QueryClientProvider>,
  );
}

describe("ContentPlanWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createContentPlan.mockReset();
    updateContentPlanApproval.mockReset();
  });

  it("guides the user through steps and generates a preview", async () => {
    const response: ContentPlanJob = {
      id: "job_123",
      plan: {
        influencerId: "inf_1",
        theme: "Summer Glow",
        targetPlatforms: ["instagram", "tiktok"],
        posts: [
          { caption: "Caption 1", hashtags: ["#glow"] },
          { caption: "Caption 2", hashtags: ["#vibes"] },
        ],
        createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      },
    };
    createContentPlan.mockResolvedValue(response);

    renderWizard();

    fireEvent.change(screen.getByLabelText(/influencer id/i), { target: { value: "inf_1" } });
    fireEvent.change(screen.getByLabelText(/persona summary/i), { target: { value: "Energetic AI" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: "Summer Glow" } });
    fireEvent.click(screen.getByRole("button", { name: /tiktok/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/review prompt/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /generate content plan/i }));

    await waitFor(() => {
      expect(createContentPlan).toHaveBeenCalled();
    });

    expect(createContentPlan.mock.calls[0][0]).toEqual({
      influencerId: "inf_1",
      theme: "Summer Glow",
      targetPlatforms: ["instagram", "tiktok"],
    });

    expect(await screen.findByText(/caption 1/i)).toBeInTheDocument();
    expect(screen.getByText(/#glow/i)).toBeInTheDocument();
  });

  it("allows regenerating and approving a plan", async () => {
    const firstResponse: ContentPlanJob = {
      id: "job_123",
      plan: {
        influencerId: "inf_1",
        theme: "Summer Glow",
        targetPlatforms: ["instagram"],
        posts: [{ caption: "First", hashtags: ["#one"] }],
        createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
      },
    };
    const secondResponse: ContentPlanJob = {
      ...firstResponse,
      plan: {
        ...firstResponse.plan,
        posts: [{ caption: "Second", hashtags: ["#two"] }],
      },
    };

    createContentPlan.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);
    updateContentPlanApproval.mockResolvedValue({
      id: "job_123",
      approvalStatus: "approved",
      plan: { ...secondResponse.plan, approvalStatus: "approved" },
    });

    renderWizard();

    fireEvent.change(screen.getByLabelText(/influencer id/i), { target: { value: "inf_1" } });
    fireEvent.change(screen.getByLabelText(/persona summary/i), { target: { value: "Energetic AI" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.change(screen.getByLabelText(/theme/i), { target: { value: "Summer Glow" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByRole("button", { name: /generate content plan/i }));
    await screen.findByText(/first/i);

    fireEvent.click(screen.getByRole("button", { name: /regenerate plan/i }));
    await screen.findByText(/second/i);

    fireEvent.click(screen.getByRole("button", { name: /approve plan/i }));

    await waitFor(() => {
      expect(updateContentPlanApproval).toHaveBeenCalled();
    });

    expect(updateContentPlanApproval.mock.calls[0][0]).toEqual({
      id: "job_123",
      approvalStatus: "approved",
      plan: secondResponse.plan,
    });
  });
});
