import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  APP_NAME: z.string().default('check-in-backend'),
  APP_VERSION: z.string().default('0.1.0'),
  API_BASE_PATH: z.string().default('/api'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_DURATION_SECONDS: z.coerce.number().int().positive().default(60),
  ATTENDANCE_PHOTO_BUCKET: z.string().min(1).default('attendance-photos'),
  SALARY_UPLOAD_BUCKET: z.string().min(1).default('salary-uploads'),
  INTERNAL_API_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional()
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ')

  throw new Error(`Invalid environment configuration: ${details}`)
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export type AppConfig = typeof env
