# Check-in Backend

Hono Node.js backend for the check-in app.

## Architecture

Routes are separated by consumer:

- `GET /health` service health check
- `/api/auth/*` shared auth routes for frontend and backoffice
- `/api/frontend/*` frontend API routes
- `/api/mobile/*` mobile capability routes
- `/api/backoffice/*` backoffice API routes
- `/docs` Swagger UI
- `/openapi.json` OpenAPI document

Supabase is used for database and email/password auth. To disable email verification, turn off email confirmation in Supabase Dashboard under Authentication settings.

## Supabase Migrations

Phase 1-3 schema is in `supabase/migrations/202606050001_phase_1_3_foundation.sql`.

It creates:

- roles, permissions, role permissions, and user permission overrides
- profiles linked to `auth.users`
- device bindings
- work locations and employee 4-node work areas
- audit and event logs

Phase 4-6 schema is in `supabase/migrations/202606050002_phase_4_6_attendance_emergency.sql`.

It creates:

- private Supabase Storage bucket `attendance-photos`
- attendance signed upload tracking, attendance days, and attendance events
- emergency logs

Phase 7-8 schema is in `supabase/migrations/202606050003_phase_7_8_salary_retention.sql`.

It creates:

- private Supabase Storage bucket `salary-uploads`
- salary upload batches and salary records

Default seeded roles:

- `ADMIN`: all seeded permissions
- `USER`: `mobile:attendance`, `mobile:emergency`

Authorization is permission-based. Roles are only default permission bundles.

## Phase 1-3 APIs

Shared auth:

- `POST /api/auth/sign-in`
- `POST /api/auth/refresh`
- `POST /api/auth/sign-out`
- `GET /api/auth/me`

Backoffice:

- `GET /api/backoffice/users`
- `GET /api/backoffice/roles`
- `GET /api/backoffice/permissions`
- `GET /api/backoffice/users/:userId/device`
- `POST /api/backoffice/users/:userId/device/reset`
- `GET /api/backoffice/work-locations`
- `POST /api/backoffice/work-locations`
- `PATCH /api/backoffice/work-locations/:workLocationId`
- `GET /api/backoffice/users/:userId/work-area`
- `PUT /api/backoffice/users/:userId/work-area`

Mobile attendance and emergency:

- `POST /api/mobile/attendance/upload-url`
- `POST /api/mobile/attendance/check-in`
- `POST /api/mobile/attendance/check-out`
- `POST /api/mobile/emergency`

Backoffice attendance and emergency:

- `GET /api/backoffice/attendance`
- `GET /api/backoffice/attendance/:attendanceDayId`
- `PATCH /api/backoffice/attendance/:attendanceDayId/review`
- `GET /api/backoffice/emergency-logs`
- `GET /api/backoffice/emergency-logs/:emergencyLogId`
- `PATCH /api/backoffice/emergency-logs/:emergencyLogId`

Backoffice salary:

- `POST /api/backoffice/salary/upload-url`
- `POST /api/backoffice/salary/import`
- `GET /api/backoffice/salary/uploads`
- `GET /api/backoffice/salary/records`

Internal maintenance:

- `POST /api/internal/retention/cleanup`
- `GET /api/internal/retention/cleanup` for Vercel Cron

## Local Development

```sh
corepack enable
pnpm install
cp check-in-backend/.env.example check-in-backend/.env
pnpm dev
```

## Vercel

Deploy from the repository root. Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS`
- `LOG_LEVEL`
- `RATE_LIMIT_POINTS`
- `RATE_LIMIT_DURATION_SECONDS`
- `ATTENDANCE_PHOTO_BUCKET`
- `SALARY_UPLOAD_BUCKET`
- `INTERNAL_API_SECRET`
- `CRON_SECRET`

The root `index.ts` re-exports `check-in-backend/src/index.ts` so Vercel can detect a Hono app from the root project.

The root `vercel.json` registers a daily retention cleanup cron:

```json
{
  "path": "/api/internal/retention/cleanup",
  "schedule": "0 20 * * *"
}
```

Vercel invokes cron jobs with `GET` and sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is configured.

## Docker

Build from the repository root:

```sh
docker build -f check-in-backend/Dockerfile -t check-in-backend .
docker run --env-file check-in-backend/.env -p 3000:3000 check-in-backend
```
