import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { PromptSummaryCard } from "../components/content-plans/PromptSummaryCard";

describe("PromptSummaryCard", () => {
  it("matches the snapshot", () => {
    const { asFragment } = render(
      <PromptSummaryCard
        personaSummary="Energetic AI influencer with a focus on wellness"
        theme="Summer Glow"
        targetPlatforms={["instagram", "tiktok"]}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
