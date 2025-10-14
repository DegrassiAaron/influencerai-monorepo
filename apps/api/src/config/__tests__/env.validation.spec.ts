import { validateEnv } from '../env.validation';

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
});
