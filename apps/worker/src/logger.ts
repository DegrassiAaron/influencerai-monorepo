import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

export const logger = pino({
  level,
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, singleLine: false },
      },
});

