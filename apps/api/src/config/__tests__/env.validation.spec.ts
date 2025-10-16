import { computeBullEnabled, validateEnv } from '../env.validation';

describe('validateEnv', () => {
  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('applies defaults for optional values', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      OPENROUTER_API_KEY: 'sk-test',
    });

    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.OPENROUTER_MAX_RETRIES).toBe(3);
    expect(env.OPENROUTER_TIMEOUT_MS).toBe(60000);
    expect(env.S3_ENDPOINT).toBe('http://localhost:9000');
    expect(env.LOG_LEVEL).toBe('debug');
    expect(env.BULL_ENABLED).toBe(true);
    expect(env.LOGGER_PRETTY).toBe(true);
  });

  it('derives flags from boolean-like inputs', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'production',
      DISABLE_BULL: '1',
      SKIP_S3_INIT: 'true',
      LOGGER_PRETTY: '0',
      OPENROUTER_API_KEY: 'sk-test',
    });

    expect(env.BULL_ENABLED).toBe(false);
    expect(env.SKIP_S3_INIT).toBe(true);
    expect(env.LOGGER_PRETTY).toBe(false);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('rejects invalid boolean-like inputs', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'production',
        SKIP_S3_INIT: 'treu',
        OPENROUTER_API_KEY: 'sk-test',
      }),
    ).toThrow(/boolean/i);
  });

  it('throws when OPENROUTER_API_KEY is missing outside test environments', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        NODE_ENV: 'production',
      }),
    ).toThrow(/OPENROUTER_API_KEY/);
  });

  it('allows missing OPENROUTER_API_KEY in test environment only', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'test',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.OPENROUTER_API_KEY).toBe('');
  });

  it('trims the OPENROUTER_API_KEY value', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: 'development',
      OPENROUTER_API_KEY: '  sk-test  ',
    });

    expect(env.OPENROUTER_API_KEY).toBe('sk-test');
  });

  it('normalizes NODE_ENV casing and surrounding whitespace', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      NODE_ENV: ' TEST ',
      OPENROUTER_API_KEY: 'sk-test',
    });

    expect(env.NODE_ENV).toBe('test');
  });

  describe('computeBullEnabled', () => {
    it('enables Bull when running outside of test environments', () => {
      expect(
        computeBullEnabled({
          NODE_ENV: 'production',
          DISABLE_BULL: undefined,
        }),
      ).toBe(true);
    });

    it('disables Bull when NODE_ENV is test even with surrounding whitespace', () => {
      expect(computeBullEnabled({ NODE_ENV: ' test ' })).toBe(false);
    });

    it('disables Bull when explicitly requested via truthy strings', () => {
      expect(
        computeBullEnabled({
          NODE_ENV: 'development',
          DISABLE_BULL: 'Yes',
        }),
      ).toBe(false);
    });

    it('throws when DISABLE_BULL is an invalid boolean-like value', () => {
      expect(() =>
        computeBullEnabled({
          NODE_ENV: 'development',
          DISABLE_BULL: 'nah',
        }),
      ).toThrow(/boolean/i);
    });
  });
});
