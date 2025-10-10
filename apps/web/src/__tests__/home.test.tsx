import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import { ThemeProvider } from "@/components/theme-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("Home page", () => {
  it("renders the dashboard headline and description", () => {
    render(
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("heading", { name: /control center di influencerai/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Monitora campagne, job e content plan in un unico spazio/i)
    ).toBeInTheDocument();
  });
});
