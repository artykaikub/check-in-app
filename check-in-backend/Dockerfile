# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY check-in-backend/package.json ./check-in-backend/package.json
RUN pnpm install --frozen-lockfile --filter check-in-backend

FROM deps AS builder
COPY check-in-backend ./check-in-backend
RUN pnpm --filter check-in-backend build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY check-in-backend/package.json ./check-in-backend/package.json
RUN pnpm install --prod --frozen-lockfile --filter check-in-backend && pnpm store prune

COPY --from=builder /app/check-in-backend/dist ./check-in-backend/dist

WORKDIR /app/check-in-backend
EXPOSE 3000

CMD ["node", "dist/server.js"]
