import { describe, expect, it } from 'vitest';
import type { ModuleResolver } from '../yaml-parser.js';
import { createYamlParser } from '../yaml-parser.js';

describe('createYamlParser', () => {
  it('prefers the yaml package when available', () => {
    const parse = createYamlParser(new StubResolver({
      yaml: { parse: (content: string) => ({ parsed: content }) }
    }));

    expect(parse('content')).toEqual({ parsed: 'content' });
  });

  it('falls back to js-yaml when yaml is unavailable', () => {
    const parse = createYamlParser(
      new StubResolver({ 'js-yaml': { load: (content: string) => ({ loaded: content }) } })
    );

    expect(parse('content')).toEqual({ loaded: 'content' });
  });

  it('throws a descriptive error when no parser is available', () => {
    const resolver = new StubResolver({});

    expect(() => createYamlParser(resolver)).toThrowError(
      /Install either "yaml" or "js-yaml" to continue/
    );
  });
});

class StubResolver implements ModuleResolver {
  private readonly modules: Map<string, unknown>;

  constructor(modules: Record<string, unknown>) {
    this.modules = new Map(Object.entries(modules));
  }

  has(specifier: string): boolean {
    return this.modules.has(specifier);
  }

  import<T>(specifier: string): T {
    if (!this.modules.has(specifier)) {
      throw new Error(`Module ${specifier} not found in stub resolver`);
    }

    return this.modules.get(specifier) as T;
  }
}
