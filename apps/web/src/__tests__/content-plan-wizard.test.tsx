import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentPlanWizard } from "../components/content-plans/ContentPlanWizard";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ContentPlanWizard", () => {
  const API_BASE_URL = "https://api.example.com";

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE_URL;
  });

  it("guides the user through persona and theme steps before showing a preview", async () => {
    const user = userEvent.setup();

    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.endsWith("/content-plans")) {
        return {
          ok: true,
          json: async () => ({
            id: "plan-123",
            status: "DRAFT",
            persona: {
              name: "Social Media Manager",
              audience: "Marketing Team",
            },
            prompt: "Generated prompt",
            posts: [
              { id: "post-1", title: "Post 1", summary: "Summary 1", callToAction: "CTA 1" },
              { id: "post-2", title: "Post 2", summary: "Summary 2", callToAction: "CTA 2" },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    renderWithProviders(<ContentPlanWizard />);

    await user.type(screen.getByLabelText(/^persona$/i), "Social Media Manager");
    await user.type(screen.getByLabelText(/audience/i), "Marketing Team");
    await user.type(
      screen.getByLabelText(/contesto della persona/i),
      "Gestisce i contenuti dei social media"
    );

    await user.click(screen.getByRole("button", { name: /prossimo/i }));

    await user.type(screen.getByLabelText(/tema del piano/i), "Lancio prodotto");
    await user.type(screen.getByLabelText(/tono/i), "Ispirazionale");
    await user.clear(screen.getByLabelText(/numero di post/i));
    await user.type(screen.getByLabelText(/numero di post/i), "3");
    await user.type(screen.getByLabelText(/call to action/i), "Scarica ora");

    await user.click(screen.getByRole("button", { name: /genera anteprima/i }));

    await waitFor(() => {
      expect(screen.getByText("Post 1")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/content-plans`);
    expect(init?.method).toBe("POST");
  });

  it("allows regenerating the preview and approving the plan", async () => {
    const user = userEvent.setup();

    const responses = [
      {
        id: "plan-123",
        status: "DRAFT",
        persona: {
          name: "Social Media Manager",
          audience: "Marketing Team",
        },
        prompt: "Generated prompt",
        posts: [
          { id: "post-1", title: "Post 1", summary: "Summary 1", callToAction: "CTA 1" },
        ],
      },
      {
        id: "plan-123",
        status: "DRAFT",
        persona: {
          name: "Social Media Manager",
          audience: "Marketing Team",
        },
        prompt: "Generated prompt",
        posts: [
          { id: "post-1", title: "Post 1", summary: "Summary 1", callToAction: "CTA 1" },
          { id: "post-2", title: "Post 2", summary: "Summary 2", callToAction: "CTA 2" },
        ],
      },
      {
        id: "plan-123",
        status: "APPROVED",
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      if (typeof input === "string" && input.endsWith("/content-plans")) {
        return {
          ok: true,
          json: async () => responses.shift(),
        } as Response;
      }

      if (typeof input === "string" && input.includes("/content-plans/plan-123/status")) {
        return {
          ok: true,
          json: async () => responses.pop(),
        } as Response;
      }

      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    renderWithProviders(<ContentPlanWizard />);

    await user.type(screen.getByLabelText(/^persona$/i), "Social Media Manager");
    await user.type(screen.getByLabelText(/audience/i), "Marketing Team");
    await user.type(
      screen.getByLabelText(/contesto della persona/i),
      "Gestisce i contenuti dei social media"
    );
    await user.click(screen.getByRole("button", { name: /prossimo/i }));
    await user.type(screen.getByLabelText(/tema del piano/i), "Lancio prodotto");
    await user.type(screen.getByLabelText(/tono/i), "Ispirazionale");
    await user.clear(screen.getByLabelText(/numero di post/i));
    await user.type(screen.getByLabelText(/numero di post/i), "1");
    await user.type(screen.getByLabelText(/call to action/i), "Scarica ora");
    await user.click(screen.getByRole("button", { name: /genera anteprima/i }));

    await waitFor(() => {
      expect(screen.getByText("Post 1")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /rigenera piano/i }));

    await waitFor(() => {
      expect(screen.getByText("Post 2")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /approva piano/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/content-plans/plan-123/status`,
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });
  });
});
