import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "../app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("Home", () => {
  it("renders dashboard heading and logout button", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /influencerai dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(
      screen.getByText(/virtual influencer content generation platform/i)
    ).toBeInTheDocument();
  });
});
