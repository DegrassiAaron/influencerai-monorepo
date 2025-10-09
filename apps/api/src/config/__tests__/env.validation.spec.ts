import { validateEnv } from '../env.validation';

describe('validateEnv', () => {
  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('applies defaults for optional values', () => {
    const env = validateEnv({ DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' });

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
    });

    expect(env.BULL_ENABLED).toBe(false);
    expect(env.SKIP_S3_INIT).toBe(true);
    expect(env.LOGGER_PRETTY).toBe(false);
    expect(env.LOG_LEVEL).toBe('info');
  });
});
