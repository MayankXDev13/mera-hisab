# api-003: Monthly charges engine — idempotent scheduled compounding

## Problem

`apps/api/src/lib/charges.ts` loops `store.customers.values()` and calls `computeOutstanding` from `apps/api/src/lib/transactions.ts` which scans all transactions, so each run is `O(n*m)`. Dedup uses an in-memory `chargeKey` Map, not the database unique `monthly_charges(customerId, periodMonth)` from `packages/db/src/schema/index.ts`. A sentinel `_system_charges` account is auto-created hidden at `charges.ts:99`. Clock is only partly injectable (`runMonthlyCharges({ now })` exists but `writeAudit` still calls `nowIso()`), and `apps/api/src/index.ts` cron `5 0 1 * * Asia/Kolkata` calls `runMonthlyCharges({ actorId: null })` while `apps/api/src/lib/audit.ts` throws on null actor.

## Proposed Interface

A `ChargeEngine` that owns period math, outstanding calculation, idempotent creation, and waivers, built on top of the ledger and repo.

```ts
// apps/api/src/lib/charges.ts
export type ChargeEngine = {
  run(period: string, ctx: { now?: Date, actorId: string | null }): Promise<{ created: number, skipped: number }>
  runCurrentMonth(ctx: { actorId: string | null, now?: Date }): Promise<{ created: number, skipped: number }>
  waive(chargeId: string, amountPaise: number | null, ctx: { actorId: string }): Promise<{ charge: MonthlyCharge, waiveTx: Transaction }>
}

export function createChargeEngine(deps: {
  repo: LedgerRepo
  ledger: Ledger
  clock: Clock
  ids: IdGenerator
  systemAccountId?: string
}): ChargeEngine
```

Usage:

```ts
const engine = createChargeEngine({ repo, ledger, clock, ids })
await engine.run("2026-03", { actorId: null }) // cron as system
await engine.waive(chargeId, null, { actorId: user.id }) // full waiver
```

What it hides: `periodForDate`, `chargeAmountPaise = Math.round(base * bps / 10000)`, `computeOutstanding` aggregation, `_system_charges` ownership, `chargeKey` dedup. What it exposes: `run`, `runCurrentMonth`, `waive` with typed results.

## Dependency Strategy

**In-process / Local-substitutable.** Math is pure and stays pure. `computeOutstanding` moves from Map scan to a grouped SQL `SUM` through the repo when api-001 lands. No external service, clock and ids are injectable ports.

## Testing Strategy

- **New boundary tests to write**
  - fixed clock `2026-03-01 Asia/Kolkata` creates one charge per active customer with correct `baseAmountPaise` and `chargeAmountPaise`
  - run twice for same period creates zero new charges, returns `skipped`
  - waived charge records `waivedAmountPaise` and `status` (`waived` vs `reduced`) and stops counting toward outstanding
  - partial waive with amount leaves `reduced`, full waive with null waives entire charge
  - system account is created explicitly once and reused
  - null actor from cron writes audit as `system` without throw

- **Old tests to delete**
  - isolated unit tests on `periodForDate` or `chargeAmountPaise` that never verify idempotence; keep math helpers but test through engine boundary

- **Test environment needs**
  - ephemeral Postgres or memory repo with real aggregates, fixed `Clock` and `IdGenerator`

## Implementation Recommendations

- Own period string `YYYY-MM` formatting and rate snapshot `rateSnapshotBps` inside the engine; do not let callers compute base.
- Hide dedup via database unique violation handling, not Map check; translate unique error to `skipped`.
- Expose `runCurrentMonth` as the trivial default so cron and manual `POST /charges/run` share the same path.
- Migrate `routes/charges.ts` to delegate to `engine.run` and `engine.waive`; remove direct `store.transactions.set` for charge debits.
