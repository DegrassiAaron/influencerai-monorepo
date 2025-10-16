import { beforeEach, describe, expect, it, vi } from 'vitest';

const localFontMock = vi.fn((options: unknown) => ({
  className: 'mocked-font',
  variable: (options as { variable?: string }).variable ?? '',
}));

vi.mock('next/font/local', () => ({
  __esModule: true,
  default: localFontMock,
}));

describe('fonts configuration', () => {
  const expectedNormalPath =
    '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2';
  const expectedItalicPath =
    '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2';

  beforeEach(() => {
    vi.resetModules();
    localFontMock.mockClear();
  });

  it('loads the Inter font from the package assets', async () => {
    await import('../fonts');

    expect(localFontMock).toHaveBeenCalledTimes(1);

    const [config] = localFontMock.mock.calls[0];
    expect(config).toMatchObject({
      display: 'swap',
      variable: '--font-inter',
    });

    expect((config as { src: Array<Record<string, string>> }).src).toEqual([
      expect.objectContaining({
        path: expectedNormalPath,
        style: 'normal',
        weight: '100 900',
      }),
      expect.objectContaining({
        path: expectedItalicPath,
        style: 'italic',
        weight: '100 900',
      }),
    ]);
  });
});
