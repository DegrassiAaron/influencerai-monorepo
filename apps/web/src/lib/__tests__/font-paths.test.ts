import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolveMock = vi.fn((specifier: string) => specifier);

describe("font paths", () => {
  const normalSpecifier = "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2";
  const italicSpecifier = "@fontsource-variable/inter/files/inter-latin-wght-italic.woff2";

  beforeEach(() => {
    vi.resetModules();
    resolveMock.mockClear();
    resolveMock.mockImplementation((specifier: string) => `/resolved/${specifier}`);
    globalThis.__influenceraiResolveFont__ = resolveMock;
  });

  afterEach(() => {
    delete globalThis.__influenceraiResolveFont__;
  });

  it("exports Inter font paths resolved from the fontsource package", async () => {
    const { interFontSources } = await import("../font-paths");

    expect(resolveMock).toHaveBeenCalledWith(normalSpecifier);
    expect(resolveMock).toHaveBeenCalledWith(italicSpecifier);
    expect(interFontSources).toEqual({
      normal: `/resolved/${normalSpecifier}`,
      italic: `/resolved/${italicSpecifier}`,
    });
  });
});
