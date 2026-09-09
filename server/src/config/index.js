import 'dotenv/config';
import { z } from 'zod';

/**
 * Parse and validate process.env once, at startup. Anything required that is
 * missing or malformed fails fast with a readable message instead of surfacing
 * as a confusing runtime error later.
 */
const bool = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(8, 'JWT_ACCESS_SECRET must be set (>=8 chars)'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET must be set (>=8 chars)'),
  // Access token is short-lived but auto-renewed silently by the client, so the
  // user never sees a login prompt. The refresh token (rotated, revocable) is
  // what keeps a user/admin "logged in for a long time".
  JWT_ACCESS_TTL: z.string().default('1h'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  TRUST_PROXY: bool(false),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  PUBLIC_UPLOAD_BASE_URL: z.string().default('http://localhost:4000/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool(false),

  // Manual settlement only. No external payment gateway.
  PAYMENT_DRIVER: z.enum(['manual']).default('manual'),

  MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
  MAIL_FROM: z.string().default('Swarna Prabha <no-reply@swarnaprabha.local>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  },
  corsOrigins: env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
  cookieDomain: env.COOKIE_DOMAIN || undefined,
  trustProxy: env.TRUST_PROXY,
  storage: {
    driver: env.STORAGE_DRIVER,
    uploadDir: env.UPLOAD_DIR,
    publicBaseUrl: env.PUBLIC_UPLOAD_BASE_URL,
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
  },
  payment: { driver: env.PAYMENT_DRIVER },
  mail: {
    driver: env.MAIL_DRIVER,
    from: env.MAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  },
};

export default config;
