# Check-in Backoffice

Next.js backoffice app for the check-in platform.

## Stack

- Next.js App Router
- React Query for server state
- Orval for OpenAPI-generated API clients
- shadcn/ui default style
- Tailwind CSS v4

## Development

```sh
cp check-in-backoffice/.env.example check-in-backoffice/.env.local
pnpm dev:backoffice
```

The app runs on `http://localhost:3001` by default and expects the backend API at `NEXT_PUBLIC_API_BASE_URL`.

## Generate API Hooks

```sh
pnpm codegen
```

The codegen script builds the backend, exports its OpenAPI document into `src/generated/openapi.json`, and generates React Query hooks under `src/generated/api`.

## Modules

- Users: employee list, create user, role updates, permission overrides, and mobile device reset action
- Work areas: work locations and employee four-point geofence editor
- Attendance: daily check-in/check-out review with photo links
- Emergency: emergency event queue and response status updates
- Salary: Excel signed upload, import trigger, upload batches, and salary records
- Logs: audit and event log review

## Map

The work area editor uses Leaflet with OpenStreetMap tiles. It does not require a paid map API key.

## Vercel

Deploy this app as a separate Vercel project with root directory set to `check-in-backoffice`.

Required environment variables:

- `NEXT_PUBLIC_API_BASE_URL`: production URL of the backend Vercel project, for example `https://check-in-backend.vercel.app`
