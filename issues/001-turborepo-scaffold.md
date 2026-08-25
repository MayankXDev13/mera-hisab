# 001: Turborepo scaffold with web, API, and shared packages

## Parent PRD

`issues/prd.md`

## What to build

Set up the Turborepo monorepo so every later slice has a place to live and a proven web-to-API path. Two apps: a Next.js frontend (`apps/web`) and an Express API in TypeScript (`apps/api`). Shared packages: one for types and zod schemas, one for the Drizzle schema and client (stubbed for now). The end-to-end proof is simple: the Next.js app fetches `/api/v1/health` from the Express server and renders the response on screen. Supabase Postgres connection comes from env vars; the Drizzle client initializes against it even before any tables exist.

Keep it boring: TypeScript strict mode, eslint, one `dev` command at the root that runs both apps, env var loading via `.env` files that are gitignored with an example committed.

## Acceptance criteria

- [ ] `pnpm dev` (or npm equivalent) starts both apps from the repo root
- [ ] Next.js app loads and displays the health check response fetched from the Express API
- [ ] Express serves routes under `/api/v1` with zod-validated request handling wired
- [ ] `packages/shared` exports types consumed by both apps
- [ ] `packages/db` holds the Drizzle client connected to Supabase Postgres via `DATABASE_URL`
- [ ] TypeScript strict passes in all workspaces; lint runs clean
- [ ] `.env.example` committed, real `.env` files gitignored
- [ ] README documents the run commands

## Blocked by

None - can start immediately

## User stories addressed

Foundation slice; enables all stories in the parent PRD.
