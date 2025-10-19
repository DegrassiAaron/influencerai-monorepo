import { z } from 'zod';

type BooleanLike = boolean | number | string | undefined | null;

const truthyStrings = new Set(['1', 'true', 'yes', 'on']);
const falsyStrings = new Set(['0', 'false', 'no', 'off', '']);

const coerceOptionalBoolean = (value: BooleanLike): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
    throw new Error('Invalid boolean value');
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (truthyStrings.has(normalized)) {
      return true;
    }
    if (falsyStrings.has(normalized)) {
      return false;
    }
    throw new Error('Invalid boolean value');
  }

  throw new Error('Invalid boolean value');
};

const normalizeNodeEnv = (value: unknown): 'development' | 'production' | 'test' => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'development' || normalized === 'production' || normalized === 'test') {
      return normalized;
    }
  }
  return 'development';
};

const preprocessNodeEnv = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const nodeEnvSchema = z.preprocess(
  preprocessNodeEnv,
  z.enum(['development', 'production', 'test']).default('development')
);

const booleanLike = z
  .union([z.boolean(), z.number(), z.string()])
  .optional()
  .transform((value) => coerceOptionalBoolean(value));

const logLevelEnum = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

/**
 * Environment variables validation schema with Zod.
 *
 * **Mandatory variables** (no fallback):
 * - `DATABASE_URL`: PostgreSQL connection string (must be provided)
 *
 * **Mandatory with runtime check** (fails fast outside test env):
 * - `OPENROUTER_API_KEY`: Required in development/production, optional in test
 *
 * **Optional with sensible defaults**:
 * - `NODE_ENV`: defaults to 'development'
 * - `PORT`: defaults to 3001 (standard API port)
 * - `REDIS_URL`: defaults to 'redis://localhost:6379' (local Redis)
 * - `BULL_PREFIX`: defaults to 'bull' (queue namespace)
 * - `LOG_LEVEL`: derived from NODE_ENV ('debug' in dev, 'info' in prod)
 * - `LOGGER_PRETTY`: derived from NODE_ENV (true in dev, false in prod)
 * - `OPENROUTER_MAX_RETRIES`: defaults to 3 (resilient API calls)
 * - `OPENROUTER_TIMEOUT_MS`: defaults to 60000 (1 minute)
 * - `OPENROUTER_BACKOFF_BASE_MS`: defaults to 250ms (exponential backoff)
 * - `OPENROUTER_BACKOFF_JITTER_MS`: defaults to 100ms (jitter to avoid thundering herd)
 * - `WORKER_JOB_ATTEMPTS`: defaults to 3 (retry failed jobs)
 * - `WORKER_JOB_BACKOFF_DELAY_MS`: defaults to 5000 (5 seconds between retries)
 * - `S3_ENDPOINT`: defaults to 'http://localhost:9000' (local MinIO)
 * - `S3_KEY`: defaults to 'minio' (local MinIO credentials)
 * - `S3_SECRET`: defaults to 'minio12345' (local MinIO credentials)
 * - `S3_BUCKET`: defaults to 'assets' (default bucket name)
 * - `AWS_REGION`: defaults to 'us-east-1' (MinIO compatible region)
 * - `JWT_SECRET`: defaults to 'dev_jwt_secret_change_me' (INSECURE for dev only)
 *
 * **Boolean-like flags** (optional, default to undefined/false):
 * - `DISABLE_BULL`: disables job queue (useful for debugging)
 * - `SKIP_S3_INIT`: skips MinIO bucket initialization (useful for tests)
 *
 * @see {@link validateEnv} for usage
 */
export const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    PORT: z.coerce.number().int().min(0).default(3001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    BULL_PREFIX: z.string().min(1).default('bull'),
    DISABLE_BULL: booleanLike,
    LOG_LEVEL: logLevelEnum.optional(),
    LOGGER_PRETTY: booleanLike,
    OPENROUTER_API_KEY: z.string().default(''),
    OPENROUTER_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
    OPENROUTER_TIMEOUT_MS: z.coerce.number().int().min(0).default(60000),
    OPENROUTER_BACKOFF_BASE_MS: z.coerce.number().int().min(0).default(250),
    OPENROUTER_BACKOFF_JITTER_MS: z.coerce.number().int().min(0).default(100),
    WORKER_JOB_ATTEMPTS: z.coerce.number().int().min(1).default(3),
    WORKER_JOB_BACKOFF_DELAY_MS: z.coerce.number().int().min(0).default(5000),
    S3_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
    S3_KEY: z.string().min(1).default('minio'),
    S3_SECRET: z.string().min(1).default('minio12345'),
    S3_BUCKET: z.string().min(1).default('assets'),
    AWS_REGION: z.string().min(1).default('us-east-1'),
    SKIP_S3_INIT: booleanLike,
    JWT_SECRET: z.string().min(1).default('dev_jwt_secret_change_me'),
    PIPELINE_WEBHOOK_SECRET: z.string().min(1).optional(),
    WEBHOOK_HMAC_SECRET: z.string().min(1).optional(),
  })
  .superRefine((config, ctx) => {
    const trimmedKey = config.OPENROUTER_API_KEY.trim();
    if (config.NODE_ENV !== 'test' && trimmedKey.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OPENROUTER_API_KEY is required outside test environments',
        path: ['OPENROUTER_API_KEY'],
      });
    }
  })
  .transform((config) => {
    const loggerPretty = (config.LOGGER_PRETTY ?? config.NODE_ENV !== 'production') as boolean;
    const logLevel = config.LOG_LEVEL ?? (config.NODE_ENV === 'production' ? 'info' : 'debug');
    const disableBull = (config.DISABLE_BULL ?? false) as boolean;
    const skipS3Init = (config.SKIP_S3_INIT ?? false) as boolean;
    const bullEnabled = config.NODE_ENV !== 'test' && !disableBull;
    const openRouterApiKey = config.OPENROUTER_API_KEY.trim();
    return {
      ...config,
      DISABLE_BULL: disableBull,
      LOG_LEVEL: logLevel,
      LOGGER_PRETTY: loggerPretty,
      SKIP_S3_INIT: skipS3Init,
      BULL_ENABLED: bullEnabled,
      OPENROUTER_API_KEY: openRouterApiKey,
      PIPELINE_WEBHOOK_SECRET: config.PIPELINE_WEBHOOK_SECRET,
      WEBHOOK_HMAC_SECRET: config.WEBHOOK_HMAC_SECRET,
    };
  });

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables using the Zod schema.
 *
 * **Failing fast behavior:**
 * - Throws immediately if `DATABASE_URL` is missing (mandatory)
 * - Throws if `OPENROUTER_API_KEY` is missing outside test environment
 * - Throws if boolean-like values are invalid (e.g., 'nah', 'treu')
 * - Throws if numeric values are out of range (e.g., negative ports)
 *
 * **Usage in NestJS:**
 * ```ts
 * ConfigModule.forRoot({
 *   isGlobal: true,
 *   validate: validateEnv,
 * })
 * ```
 *
 * @param config - Raw environment variables from `process.env`
 * @returns Validated and typed configuration with defaults applied
 * @throws {ZodError} When validation fails (fails fast on startup)
 */
export const validateEnv = (config: Record<string, unknown>): AppConfig => envSchema.parse(config);

export const computeBullEnabled = (env: Record<string, unknown>): boolean => {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const disableBull = coerceOptionalBoolean(env.DISABLE_BULL as BooleanLike) ?? false;
  return nodeEnv !== 'test' && !disableBull;
};
