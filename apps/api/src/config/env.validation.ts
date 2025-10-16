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

const preprocessNodeEnv = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

const nodeEnvSchema = z.preprocess(
  preprocessNodeEnv,
  z.enum(['development', 'production', 'test']).default('development'),
);

const booleanLike = z
  .union([z.boolean(), z.number(), z.string()])
  .optional()
  .transform((value) => coerceOptionalBoolean(value));

const logLevelEnum = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

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
    const loggerPretty = (config.LOGGER_PRETTY ?? (config.NODE_ENV !== 'production')) as boolean;
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
    };
  });

export type AppConfig = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): AppConfig => envSchema.parse(config);

export const computeBullEnabled = (env: Record<string, unknown>): boolean => {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const disableBull = coerceOptionalBoolean(env.DISABLE_BULL as BooleanLike) ?? false;
  return nodeEnv !== 'test' && !disableBull;
};
