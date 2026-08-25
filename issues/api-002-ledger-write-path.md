# api-002: Ledger single write path — atomic post and reverse

## Problem

`apps/api/src/lib/transactions.ts` `postTransaction` checks `currentBalancePaise` and `usedPaise`, mutates the Map, inserts a transaction, then calls `writeAudit`. If audit throws, balance stays mutated. `apps/api/src/lib/charges.ts` bypasses `postTransaction` and writes via `store.transactions.set` to dodge the balance check, so there are two write paths for the same concept. `reversedFromId` is linked via `(tx as any)`. Time and id come from `nowIso()` and `newId()` in `apps/api/src/lib/store.ts` which call `Date` and `randomUUID` inline, making tests non-deterministic. No `db.transaction()`, concurrent posts can race `usedPaise`.

The seam hides integration bugs: over-limit debit, credit clamping with `Math.max(0, usedPaise - amount)`, reversals, and audit atomicity all live across files.

## Proposed Interface

A single `Ledger` module owns every balance change. It accepts rupees or paise, converts inside, and runs atomically through the repo from api-001.

```ts
// apps/api/src/lib/ledger.ts
export type Clock = { now(): Date }
export type IdGenerator = { next(): string }

export type PostInput = {
  direction: "debit" | "credit"
  customerId: string
  sourceType: "account" | "credit_card"
  sourceId: string
  amountPaise?: number
  amountRupees?: string
  occurredAt?: string
  note?: string
}

export type Ctx = { actorId: string | null, now?: Date, id?: string }

export type Ledger = {
  post(input: PostInput, ctx: Ctx): Promise<Transaction>
  reverse(transactionId: string, ctx: Ctx): Promise<Transaction>
}

export function createLedger(deps: {
  repo: LedgerRepo
  clock: Clock
  ids: IdGenerator
  allowSystemOverdraw?: boolean
}): Ledger
```

Usage:

```ts
const ledger = createLedger({ repo, clock: { now: () => new Date() }, ids: { next: () => randomUUID() } })
const tx = await ledger.post(
  { direction: "debit", customerId, sourceType: "account", sourceId, amountRupees: "12.50" },
  { actorId: req.user!.id }
)
```

What it hides: `rupeesToPaise` conversion from `packages/shared/src/index.ts`, `SELECT ... FOR UPDATE` on account or card, balance math, audit write, id and time generation. What it exposes: `post` and `reverse` with typed errors `InsufficientFunds`, `NotFound`, `InvalidAmount`.

## Dependency Strategy

**Local-substitutable.** Depends on `LedgerRepo` via `withTransaction` (ephemeral Postgres in tests). Depends on in-process `Clock` and `IdGenerator` ports; production uses real clock and `randomUUID`, tests inject fixed values. No network or external mock.

## Testing Strategy

- **New boundary tests to write**
  - debit reduces `currentBalancePaise` or increases `usedPaise`, credit does the inverse with clamp to zero
  - over-limit debit fails with zero partial writes, no transaction row and no audit row
  - missing `customerId` or `sourceId` fails before balance check
  - negative or zero amount fails at ledger, not only zod
  - `amountRupees: "12.50"` equals `amountPaise: 1250`, `"0.01"` is 1, bad string fails
  - `reverse` creates a credit that links `reversedFromId` and is rejected if already reversed
  - audit row written atomically with transaction, system `actorId: null` records `system` not throw
  - concurrent posts against same card do not overshoot `totalLimitPaise`

- **Old tests to delete**
  - isolated unit tests on `chargeAmountPaise` or `rupeesToPaise` that hide the write path; keep `rupeesToPaise` itself but move ledger behavior to boundary tests

- **Test environment needs**
  - ephemeral Postgres via `LedgerRepo` test adapter, fixed `Clock` and `IdGenerator`

## Implementation Recommendations

- Own all balance math and the decision to allow system overdraw for internal charges; do not let callers set balances directly.
- Hide `SELECT ... FOR UPDATE` and `db.transaction` inside the repo call; ledger only calls `repo.withTransaction`.
- Expose a small error taxonomy callers can map to HTTP status (400, 404, 409, 422).
- Migrate `routes/transactions.ts` to call `ledger.post` only; remove raw `store.*.set` writes from charges and routes. Keep reversal linking typed, no `as any` casts.
