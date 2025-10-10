import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";

const STORAGE_KEY = "influencerai:theme";

function mockMatchMedia(prefersDark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQueryList: MediaQueryList = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_event, listener) => {
      listeners.add(listener as EventListener);
    },
    removeEventListener: (_event, listener) => {
      listeners.delete(listener as EventListener);
    },
    addListener: () => {
      /* deprecated */
    },
    removeListener: () => {
      /* deprecated */
    },
    dispatchEvent: () => false,
  };

  vi.stubGlobal("matchMedia", () => mediaQueryList);

  return {
    update(matches: boolean) {
      mediaQueryList.matches = matches;
      const event = new Event("change") as MediaQueryListEvent;
      Object.defineProperty(event, "matches", { value: matches });
      listeners.forEach((listener) => {
        if (typeof listener === "function") {
          listener(event);
        }
      });
    },
  };
}

describe("ModeToggle", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("toggles from light to dark mode", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("light")).toBe(true);

    await user.click(
      screen.getByRole("button", { name: /activate dark mode/i })
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("toggles from dark to light mode", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="dark">
        <ModeToggle />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(
      screen.getByRole("button", { name: /activate light mode/i })
    );

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light");
  });
});
