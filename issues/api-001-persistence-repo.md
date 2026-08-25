# api-001: Persistence repo — replace Map store with repository port

## Problem

`apps/api/src/lib/store.ts` exposes a global object of Maps (`accounts`, `cards`, `customers`, `transactions`, `charges`, `chargeKey`, `auditLogs`) plus a sentinel `_system_charges` account. Every route imports this object directly (`store.accounts.get`, `customersByUsername`, `chargeKey` checks). Types are hand-copied and diverge from `packages/db/src/schema/index.ts` Drizzle definitions (`currentBalancePaise` vs `current_balance_paise`). Constraints defined in Drizzle — unique `customers.username`, unique `monthly_charges(customerId, periodMonth)`, foreign keys — never run. `packages/db/src/client.ts` `getDb()` exists but is never imported by `apps/api`. Moving to Postgres requires touching all nine route files and risks drift.

Routes depend on the storage shape, not a contract, so change is high-friction and untestable against real constraints.

## Proposed Interface

Create a repository port that callers use, with two adapters: Postgres for production and ephemeral Postgres for tests. Keep a thin memory adapter only for fast unit scaffolding that throws the same constraint errors.

```ts
// packages/db/src/repo.ts
export type LedgerRepo = {
  withTransaction<T>(fn: (tx: LedgerRepo) => Promise<T>): Promise<T>

  accounts: {
    get(id: string): Promise<Account | null>
    list(): Promise<Account[]>
    create(a: NewAccount): Promise<Account>
    update(id: string, patch: Partial<NewAccount>): Promise<Account>
  }
  cards: {
    get(id: string): Promise<CreditCard | null>
    list(): Promise<CreditCard[]>
    create(c: NewCard): Promise<CreditCard>
    update(id: string, patch: Partial<NewCard>): Promise<CreditCard>
  }
  customers: {
    get(id: string): Promise<Customer | null>
    getByUsername(u: string): Promise<Customer | null>
    list(): Promise<Customer[]>
    create(c: NewCustomer): Promise<Customer>
    update(id: string, patch: Partial<NewCustomer>): Promise<Customer>
  }
  transactions: {
    get(id: string): Promise<Transaction | null>
    list(filter: TxFilter): Promise<Transaction[]>
    create(t: NewTransaction): Promise<Transaction>
  }
  charges: {
    get(id: string): Promise<MonthlyCharge | null>
    list(filter: ChargeFilter): Promise<MonthlyCharge[]>
    create(c: NewCharge): Promise<MonthlyCharge>
    update(id: string, patch: Partial<MonthlyCharge>): Promise<MonthlyCharge>
  }
  audit: {
    list(filter: AuditFilter): Promise<AuditLog[]>
    write(entry: NewAuditLog): Promise<void>
  }
}

// production adapter
export function createPgRepo(db: Db): LedgerRepo
// test helper against ephemeral Postgres
export function createTestPgRepo(url: string): Promise<LedgerRepo>
// optional fast fallback
export function createMemoryRepo(seed?: SeedData): LedgerRepo
```

Usage from a route or service:

```ts
export function createAccountsRouter(repo: LedgerRepo) {
  const router = Router()
  router.get("/", async (req, res) => {
    const rows = await repo.accounts.list()
    res.json(rows.map(toAccountDto))
  })
  return router
}
```

What it hides: `pg.Pool` lifecycle, Drizzle query shape, `chargeKey` dedup, Map indexes, column name mapping. What it exposes: entity methods with typed errors for constraint violations.

## Dependency Strategy

**Local-substitutable.** Production uses `getDb()` from `packages/db/src/client.ts` with `pg.Pool` against `DATABASE_URL` (Supabase pooler 6543) and `DIRECT_URL` (5432) for migrations as configured in `packages/db/drizzle.config.ts`. Tests spin an ephemeral Postgres via testcontainers, run `drizzle-kit migrate`, and call `createTestPgRepo(url)`. No mock of the database, real SQL runs.

## Testing Strategy

- **New boundary tests to write**
  - unique `customers.username` second create fails with conflict error
  - duplicate `monthly_charges(customerId, periodMonth)` rejected
  - missing `customerId` foreign key fails
  - `withTransaction` rolls back on throw, no partial rows
  - list with filter returns only matching rows

- **Old tests to delete**
  - none exist today; delete any future per-route Map mock tests that assert `store.*.get` calls

- **Test environment needs**
  - testcontainers ephemeral Postgres, Drizzle migrate before suite, `getDb(url)` per test database, teardown via `pool.end()`

## Implementation Recommendations

- Own rows, indexes, and constraint mapping inside the repo; callers never import `pg` or Drizzle table objects.
- Hide column renames (`current_balance_paise` to `currentBalancePaise`) in mappers; derive types via `InferSelectModel` so they track schema.
- Expose typed constraint errors, not raw `pg` error codes; map unique violation to `RepoError.Conflict`.
- Provide `withTransaction` that uses `db.transaction()` correctly for Postgres adapter and a no-op lock for memory adapter.
- Migrate callers by injecting `LedgerRepo` through `createApp({ repo })` rather than importing a singleton.
