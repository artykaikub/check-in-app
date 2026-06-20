# CLAUDE.md

Guidance for working in this repository. Read this before making changes.

## What this is

A **pnpm monorepo** (package manager `pnpm@10.33.0`, Node `>=20.18.1 <23`) for a
check-in / attendance platform. The root package is `check-in-monorepo`; it is the
workspace root, not a deployable app.

Members (`pnpm-workspace.yaml`):

| Package              | Stack                          | Dev port | Role                                                        |
| -------------------- | ------------------------------ | -------- | ---------------------------------------------------------- |
| `check-in-backend`   | Hono + OpenAPI/Zod, Supabase   | `3000`   | REST API, the single source of truth for data and auth     |
| `check-in-backoffice`| Next.js 15 (App Router)        | `3001`   | Admin web app — user/attendance/salary/emergency management |
| `check-in-app`       | Next.js 16 (App Router)        | `3002`   | New employee/customer-facing frontend (scaffold stage)     |

Each frontend deploys as its **own Vercel project** (Root Directory set to the package).
The repo root intentionally has **no `vercel.json`** — do not add one. See `README.md`
for the full deploy/Supabase/Vercel story.

## Commands (run from repo root)

```sh
pnpm install            # install all workspaces
pnpm dev                # run backend + backoffice + app in parallel
pnpm dev:backend        # backend only        (:3000)
pnpm dev:backoffice     # backoffice only     (:3001)
pnpm dev:app            # new app only        (:3002)
pnpm build              # build all packages (pnpm -r build)
pnpm typecheck          # tsc across all packages
pnpm test               # tests across all packages
pnpm codegen            # regenerate backoffice API client from backend OpenAPI
```

Database (Supabase, proxied to `check-in-backend`):

```sh
pnpm db:link            # link the Supabase project (once)
pnpm db:push            # apply migrations
pnpm db:seed            # run seed.sql
pnpm db:reset           # reset local Supabase
```

Target a single package directly with `pnpm --filter <name> <script>`.

## check-in-backend (Hono API)

- Entry: `src/server.ts` (HTTP), app factory `src/app.ts`, Vercel entry `src/index.ts`.
- **REST + OpenAPI**, not GraphQL/tRPC. Routes built with `@hono/zod-openapi` `createRoute()`.
- Code is **module-based** under `src/modules/<feature>/` (auth, attendance, salary,
  emergency, backoffice, frontend, mobile, internal, logs). Each module typically has
  `*.routes.ts`, `*.service.ts`, `*.schemas.ts`.
- Data layer: **Supabase JS client** (`src/db/supabase.ts`) — `supabase` (public key)
  and `supabaseAdmin` (secret key). No ORM. SQL migrations + `seed.sql` live in
  `supabase/migrations/`.
- Env is **Zod-validated** in `src/config/env.ts`; loaded via dotenvx from `.env`
  (copy from `.env.example`). Key vars: `SUPABASE_URL/PUBLISHABLE_KEY/SECRET_KEY`,
  `CORS_ORIGINS`, `INTERNAL_API_SECRET`, `CRON_SECRET`, `PORT`.
- Middleware stack: CORS, security headers, rate limiting, request logging (pino), auth,
  context — see `src/middlewares/`.
- Tests use the **Node native test runner** (`node:test`), files like `*.test.ts`.
  Run `pnpm --filter check-in-backend test`.

## check-in-backoffice (Next.js 15 admin)

- App Router with route groups: `src/app/(auth)/`, `src/app/(dashboard)/`.
- Feature code under `src/features/<feature>/`; shared UI in `src/components/ui/`
  (shadcn/ui, Radix-based); helpers in `src/lib/`.
- **Talks to the backend via generated client**: `pnpm codegen` builds the backend,
  exports its OpenAPI doc to `src/generated/openapi.json`, then runs **Orval**
  (`orval.config.ts`) to emit React Query hooks + types into `src/generated/api/**`.
  **Regenerate after backend API changes; don't hand-edit `src/generated/`.**
- There is also a hand-written fetch layer in `src/lib/api/` (`fetch-json.ts` wrapper
  with auth headers + `ApiError`, plus `backoffice.ts` business calls).
- Data fetching: **TanStack React Query v5** (config in
  `src/components/providers/app-providers.tsx`). No Redux/Zustand. Toasts via `sonner`.
- Styling: **Tailwind CSS v4** + shadcn/ui + `lucide-react`. Maps via Leaflet/OSM.
- `next.config.ts` rewrites `/api/*` to the backend; backend URL from
  `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3000`).

## check-in-app (Next.js 16 frontend — new)

- Scaffolded with `create-next-app` (Next **16**, React 19, App Router, `src/` dir,
  Turbopack, import alias `@/*`).
- **Tailwind CSS v4 + shadcn/ui** initialized. Note: shadcn here uses **Base UI**
  (`@base-ui/react`) as the primitive base, **not Radix** like the backoffice — keep
  this in mind before copying components between the two apps.
- shadcn config in `components.json` (style `base-nova`, base color `neutral`, Lucide
  icons). Components live in `src/components/ui/`, `cn()` in `src/lib/utils.ts`.
- `AGENTS.md` in this package warns that Next 16 has breaking changes vs. older
  conventions — consult `node_modules/next/dist/docs/` before writing app code.
- **Wired to the shared backend** the same way as the backoffice:
  - `pnpm --filter check-in-app codegen` (or root `pnpm codegen:app`) builds the backend,
    exports its OpenAPI to `src/generated/openapi.json`, then runs **Orval**
    (`orval.config.ts`) to emit React Query hooks + types into `src/generated/api/**`.
    Don't hand-edit `src/generated/`; regenerate after backend API changes.
  - `next.config.ts` rewrites `/api/*` to `NEXT_PUBLIC_API_BASE_URL`
    (`.env.example`, defaults to `http://localhost:3000`).
  - **TanStack React Query** provider in `src/components/providers/app-providers.tsx`
    (wraps the app in `layout.tsx`; includes `sonner` Toaster + devtools in dev).
  - **Leaflet** is installed (`leaflet` + `@types/leaflet`); CSS imported in `layout.tsx`.
- **Auth** (token-based, mirrors the backoffice; UI is a placeholder):
  - The generated client routes every call through an Orval **mutator**
    (`src/lib/api/fetch-client.ts`) that injects the `Bearer` token and throws
    `ApiError` on non-2xx. This is configured via `override.mutator` in `orval.config.ts`.
  - Tokens are stored in `localStorage` (`src/lib/api/session.ts`).
  - `src/lib/auth/auth-provider.tsx` exposes `useAuth()` (`user`, `isAuthenticated`,
    `signIn`, `signOut`) using the generated `/api/auth/*` hooks. Wrapped in
    `AppProviders` (inside React Query).
  - Route protection is **client-side** (`src/components/auth/auth-guard.tsx`) since
    tokens live in `localStorage` — Next middleware can't read them. Wrap protected
    pages in `<AuthGuard>`.
  - `src/app/login/page.tsx` is a **mock** login form (real auth flow, placeholder UI —
    pending the real design).

## Conventions & gotchas

- **TypeScript strict** everywhere; `@/*` path alias maps to each package's `src/`.
- Three dev servers occupy ports **3000 / 3001 / 3002** — keep them distinct.
- After changing backend routes/schemas, run `pnpm codegen` so backoffice types stay in sync.
- Don't commit a root `vercel.json`; each app is its own Vercel project.
- shadcn's `init` writes a circular `--font-sans: var(--font-sans)` into `globals.css`;
  in `check-in-app` this was fixed to point at `--font-geist-sans`. Watch for it if you
  re-run `shadcn init`.
