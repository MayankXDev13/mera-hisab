# Mera Hisab – private lending ledger

## Run

```sh
cp .env.example .env
pnpm install
pnpm dev          # runs API (:3002) + web (:3000)
```

Seed admin (auto-created on first API boot from `SEED_EMAIL`/`SEED_PASSWORD`, default `admin@example.com` / `Admin123!`). Or:

```sh
pnpm --filter api run seed -- admin@example.com Admin123!
```

## Apps

- `apps/api` – Express API at `http://localhost:3002`, routes under `/api/v1`
- `apps/web` – Next.js frontend at `http://localhost:3000`, pages: login, dashboard, accounts, cards, customers, transactions, charges, audit, exports

## Packages

- `packages/shared` – zod schemas + money helpers
- `packages/db` – Drizzle schema (Supabase Postgres, `DATABASE_URL`)

All amounts stored as integer paise; cron at `5 0 1 * *` with `Asia/Kolkata`.

