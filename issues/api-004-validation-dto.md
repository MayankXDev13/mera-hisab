# api-004: Validation and dto contract — single zod source

## Problem

`packages/shared/src/index.ts` defines canonical zod schemas (`createAccountSchema`, `createCardSchema`, `createCustomerSchema`, `createTransactionSchema`, `waiverSchema`, `paginationSchema`) but `apps/api/src/routes/accounts.ts`, `cards.ts`, `customers.ts`, `transactions.ts`, `charges.ts` each redeclare locals that already drift in regex and messages. `apps/web/lib/money.ts` copies `rupeesToPaise` instead of importing it. Responses are `res.json([...store.values()])` with ad hoc fields (`availablePaise` on cards, `outstandingPaise` on customers), errors mix `{ error: flatten }` with `{ error: "internal" }` at `apps/api/src/index.ts`, query `from` and `to` are `new Date(str)` with no `isNaN` guard, and only `audit` paginates.

## Proposed Interface

Unify on the shared schemas and add a thin validation plus dto layer.

```ts
// apps/api/src/lib/validate.ts
export function validateBody<S extends z.ZodTypeAny>(schema: S): RequestHandler
export function validateQuery<S extends z.ZodTypeAny>(schema: S): RequestHandler
export function toAccountDto(a: Account): AccountDto
export function toCardDto(c: CreditCard): CardDto
export function toTransactionDto(t: Transaction): TransactionDto
```

Route wiring:

```ts
import { createAccountSchema, paginationSchema } from "@repo/shared"

router.post("/", validateBody(createAccountSchema), async (req, res) => {
  const row = await repo.accounts.create(req.validated.body)
  res.status(201).json(toAccountDto(row))
})
router.get("/", validateQuery(paginationSchema.merge(filterSchema)), async (req, res) => {
  res.json(await repo.transactions.list(req.validated.query))
})
```

What it hides: zod parsing, `isNaN` date checks, error flatten mapping, column to dto renaming. What it exposes: `validateBody`, `validateQuery`, dto mappers.

## Dependency Strategy

**In-process.** No I/O boundary; merge modules and test directly. Optionally derive input types via `drizzle-zod` from `packages/db/src/schema/index.ts` to keep DB and api inputs aligned.

## Testing Strategy

- **New boundary tests to write**
  - invalid body returns 422 with `flatten` field errors, not 400 raw
  - invalid query `from=bad-date` returns 422, valid `from` and `to` filter correctly
  - `paginationSchema` defaults `page=1, limit=20` and caps at 100
  - response DTO contains `availablePaise` for cards and omits internal Map keys
  - `rupeesToPaise` parity: shared helper is the only implementation

- **Old tests to delete**
  - duplicate local schema tests per route; cover once via shared schema boundary

- **Test environment needs**
  - no stand-in; unit plus supertest against the Express app with memory repo

## Implementation Recommendations

- Own request validation at the middleware boundary; routes see `req.validated`.
- Hide date coercion and `isNaN` inside query schemas (`z.coerce.date`).
- Expose dto mappers per entity so frontend shape is documented, not accidental.
- Migrate by replacing each local `createSchema` with the import from `@repo/shared`, then add `validateQuery` to every `GET` with filters; remove `apps/web/lib/money.ts` copy in favor of `@repo/shared` export.
