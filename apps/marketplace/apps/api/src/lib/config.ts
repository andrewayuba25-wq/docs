import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  TWILIO_FAKE: z.coerce.boolean().default(true),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SID: z.string().optional(),
  S3_FAKE: z.coerce.boolean().default(true),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('artisan-uploads'),
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
});

const raw = Env.safeParse(process.env);
if (!raw.success) {
  // Print and crash loudly — config errors should be obvious in deploy logs.
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration', raw.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...raw.data,
  isDev: raw.data.NODE_ENV === 'development',
  isProd: raw.data.NODE_ENV === 'production',
  isTest: raw.data.NODE_ENV === 'test',
  corsOrigins:
    raw.data.CORS_ORIGINS === '*' ? true : raw.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
};

export type Config = typeof config;
