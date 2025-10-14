import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localFontMock = vi.fn((options: unknown) => ({
  className: "mocked-font",
  variable: (options as { variable?: string }).variable ?? "",
}));

vi.mock("next/font/local", () => ({
  __esModule: true,
  default: localFontMock,
}));

vi.mock("../font-paths", () => ({
  interFontSources: {
    normal: "/mocked/path/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
    italic: "/mocked/path/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2",
  },
}));

describe("fonts configuration", () => {
  const expectedNormalPath = "/mocked/path/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2";
  const expectedItalicPath = "/mocked/path/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2";

  beforeEach(() => {
    vi.resetModules();
    localFontMock.mockClear();
    globalThis.__influenceraiResolveFont__ = (specifier: string) =>
      `/mocked/path/${specifier}`;
  });

  afterEach(() => {
    delete globalThis.__influenceraiResolveFont__;
  });

  it("loads the Inter font from the package assets", async () => {
    await import("../fonts");

    expect(localFontMock).toHaveBeenCalledTimes(1);

    const [config] = localFontMock.mock.calls[0];
    expect(config).toMatchObject({
      display: "swap",
      variable: "--font-inter",
    });

    expect((config as { src: Array<Record<string, string>> }).src).toEqual([
      expect.objectContaining({
        path: expectedNormalPath,
        style: "normal",
        weight: "100 900",
      }),
      expect.objectContaining({
        path: expectedItalicPath,
        style: "italic",
        weight: "100 900",
      }),
    ]);
  });
});
