# Check-in App

Monorepo workspace for the check-in platform.

## Backend

The Hono backend lives in `check-in-backend`.

```sh
corepack enable
pnpm install
cp check-in-backend/.env.example check-in-backend/.env
pnpm dev
```

Vercel deploys the backend as a separate project from this root folder. The root `index.ts` exports the backend Hono app from `check-in-backend/src/index.ts`, matching Vercel's Hono entrypoint convention.

## Backoffice

The Next.js backoffice app lives in `check-in-backoffice`.

```sh
cp check-in-backoffice/.env.example check-in-backoffice/.env.local
pnpm dev:backoffice
```

Generate React Query hooks from the backend OpenAPI document:

```sh
pnpm codegen
```

Deploy the backoffice as a separate Vercel project with Root Directory set to `check-in-backoffice`.

Implemented backoffice modules:

- Users and mobile device reset
- Work locations and employee four-node work area editor
- Attendance review with check-in/check-out photos
- Emergency logs and response status
- Salary Excel upload/import and salary record review

The work area map uses Leaflet with OpenStreetMap tiles. No paid map API key is required.

## Vercel Projects

Use two Vercel projects from the same GitHub repository:

- Backend project: Root Directory is repository root. It uses the root `vercel.json`.
- Backoffice project: Root Directory is `check-in-backoffice`. It uses `check-in-backoffice/vercel.json`.

The backend root `vercel.json` includes a daily retention cleanup cron at `0 20 * * *` UTC, which is 03:00 Asia/Bangkok.

Set `CRON_SECRET` in the backend Vercel project so Vercel can call `/api/internal/retention/cleanup` securely. Manual calls may also use `INTERNAL_API_SECRET`.

## Scripts

```sh
pnpm dev
pnpm dev:backend
pnpm dev:backoffice
pnpm build
pnpm typecheck
pnpm test
```
