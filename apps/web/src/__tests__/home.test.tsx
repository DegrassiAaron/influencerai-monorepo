import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Home from "../app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("Home page", () => {
  it("renders the dashboard headline and description", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /influencerai dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/virtual influencer content generation platform/i)
    ).toBeInTheDocument();
  });
});
