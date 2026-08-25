# api-007: Web typed client — remove string URLs

## Problem

`apps/web/lib/api.ts` defines `apiFetch` but pages at `apps/web/app/*/page.tsx` call `fetch(`${API_URL}/api/v1/...`)` with hand-written URLs, cast `await r.json() as any`, waterfall three fetches for one screen, and ignore the zod schemas from `packages/shared/src/index.ts`. No `zod` response parsing, no `React Query` or `SWR`, `NEXT_PUBLIC_API_URL` is build-time and its fallback `localhost:3002` drifts from `.env` `4000`, and `credentials: "include"` is repeated. Error envelope at `apps/api/src/index.ts` (`{ error: string }` or `{ error: flatten }`) has no typed handling.

## Proposed Interface

A typed client in `@repo/shared` with two adapters: HTTP for production and in-memory fake for tests.

```ts
// packages/shared/src/client.ts
export type ApiError = { status: number, message: string, fields?: Record<string, string[]> }

export type ApiClient = {
  auth: {
    login(email: string, password: string): Promise<User>
    me(): Promise<User>
    logout(): Promise<void>
  }
  accounts: {
    list(): Promise<AccountDto[]>
    create(input: CreateAccountInput): Promise<AccountDto>
    update(id: string, patch: UpdateAccountInput): Promise<AccountDto>
    deactivate(id: string): Promise<void>
  }
  cards: { list(): Promise<CardDto[]>, create(input: CreateCardInput): Promise<CardDto> }
  customers: { list(q?: string): Promise<CustomerDto[]>, create(input: CreateCustomerInput): Promise<CustomerDto> }
  transactions: {
    list(filter?: TxFilter): Promise<{ data: TransactionDto[], total: number }>
    create(input: CreateTransactionInput): Promise<TransactionDto>
    reverse(id: string): Promise<TransactionDto>
  }
  charges: { list(filter?: ChargeFilter): Promise<MonthlyCharge[]>, run(period?: string): Promise<{ created: number }>, waive(id: string, amountPaise?: number): Promise<void> }
  dashboard: { get(): Promise<DashboardDto> }
  audit: { list(filter: AuditFilter): Promise<{ data: AuditLog[], total: number, page: number, limit: number }> }
}

export function createApiClient(opts: { baseUrl: string, fetch?: typeof fetch }): ApiClient
// test adapter
export function createFakeApiClient(seed?: SeedData): ApiClient & { __calls: unknown[] }
```

Usage in a page:

```ts
"use client"
import { createApiClient } from "@repo/shared/client"
const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_URL! })

const [accounts, cards, customers] = await Promise.all([api.accounts.list(), api.cards.list(), api.customers.list()])
```

What it hides: base URL, `credentials: "include"`, `Content-Type` header, zod response parsing, `ApiError` mapping, `NEXT_PUBLIC_API_URL` fallback. What it exposes: typed resource methods.

## Dependency Strategy

**Remote but owned — ports and adapters.** Port is `ApiClient`. Production adapter is HTTP `fetch` with `credentials: include`. Test adapter is `createFakeApiClient` that returns seeded DTOs and records calls. Logic is testable without a running api.

## Testing Strategy

- **New boundary tests to write**
  - client request has `credentials: include` and `Content-Type: application/json`
  - zod parse failure maps to typed `ApiError` with `fields`
  - 401 triggers caller-provided redirect hook, not ad hoc `if (!res.ok)` per page
  - `POST /transactions` with `amountRupees: "12.50"` is sent as string and parsed by server ledger

- **Old tests to delete**
  - per-page `global.fetch` mocks that assert URL strings; replace with `createFakeApiClient` boundary

- **Test environment needs**
  - in-memory fake adapter; optional `msw` for HTTP-level contract tests

## Implementation Recommendations

- Own base URL resolution and document that `NEXT_PUBLIC_API_URL` is build-time; expose a runtime override if you need drift-free dev.
- Hide `zod` response validation inside the client; every method parses before returning.
- Expose `ApiError` with `status` and `fields` so pages do not switch on raw `error` string.
- Migrate pages one by one from `fetch(`${API_URL}/api/v1/...`)` to `api.*` calls, removing `await r.json() as any` and `apps/web/lib/money.ts` in favor of the client and `@repo/shared` helpers. Use `Promise.all` for the three-way preload in `customers/[id]/page.tsx`.
