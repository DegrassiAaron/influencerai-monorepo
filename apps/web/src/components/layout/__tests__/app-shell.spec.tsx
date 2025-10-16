import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/AppShell";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderWithProviders(children: ReactNode) {
  return render(<ThemeProvider defaultTheme="light">{children}</ThemeProvider>);
}

describe("AppShell", () => {
  afterEach(() => {
    mockUsePathname.mockReset();
    cleanup();
  });

  it("renders header, sidebar, breadcrumbs and mobile navigation", () => {
    mockUsePathname.mockReturnValue("/dashboard");

    renderWithProviders(
      <AppShell>
        <p>Test content</p>
      </AppShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apri navigazione/i })).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders dynamic breadcrumbs for nested routes", () => {
    mockUsePathname.mockReturnValue("/dashboard/content-plans/new");

    renderWithProviders(
      <AppShell>
        <p>Nested content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Content Plans" })).toHaveAttribute(
      "href",
      "/dashboard/content-plans",
    );
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
