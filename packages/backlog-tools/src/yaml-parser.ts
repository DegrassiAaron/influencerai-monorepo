import { createRequire } from 'node:module';

export interface ModuleResolver {
  has(specifier: string): boolean;
  import<T>(specifier: string): T;
}

type ParseFunction = (content: string) => unknown;

const defaultResolver = createDefaultResolver();

export function createYamlParser(resolver: ModuleResolver = defaultResolver): ParseFunction {
  if (resolver.has('yaml')) {
    const library = resolver.import<typeof import('yaml')>('yaml');
    return library.parse;
  }

  if (resolver.has('js-yaml')) {
    const library = resolver.import<typeof import('js-yaml')>('js-yaml');
    return (content) => library.load(content);
  }

  throw new Error('No YAML parser available. Install either "yaml" or "js-yaml" to continue.');
}

function createDefaultResolver(): ModuleResolver {
  const require = createRequire(import.meta.url);

  return {
    has(specifier: string): boolean {
      try {
        require.resolve(specifier);
        return true;
      } catch (error) {
        if (isModuleNotFoundError(error)) {
          return false;
        }

        throw error;
      }
    },
    import<T>(specifier: string): T {
      return require(specifier) as T;
    }
  } satisfies ModuleResolver;
}

function isModuleNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND'
  );
}
