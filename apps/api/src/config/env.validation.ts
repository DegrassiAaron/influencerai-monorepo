import { z } from 'zod';

const booleanLike = z
  .union([z.boolean(), z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
    return false;
  });

const logLevelEnum = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
  const nodeEnv = typeof env.NODE_ENV === 'string' ? env.NODE_ENV : 'development';
  const disableBullRaw = env.DISABLE_BULL;
  let disableBull = false;
  if (typeof disableBullRaw === 'boolean') {
    disableBull = disableBullRaw;
  } else if (typeof disableBullRaw === 'number') {
    disableBull = disableBullRaw !== 0;
  } else if (typeof disableBullRaw === 'string') {
    const normalized = disableBullRaw.trim().toLowerCase();
    disableBull = ['1', 'true', 'yes', 'on'].includes(normalized);
  }
  return nodeEnv !== 'test' && !disableBull;
};
