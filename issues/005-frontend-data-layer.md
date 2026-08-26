## Parent PRD

`issues/prd.md`

## What to build

Deepen the web data layer from 12 scattered query and mutation files into a cohesive Hisab data client. Define a port `HisabData` that owns query keys, fetchers, and invalidation rules. Provide an HTTP adapter for prod (`axios` in `apps/web/lib/api/client.ts`) and an in-memory adapter for tests. Make `queryKeys.transactions.list(filters)` stable via serialization, and make `useCreateTransaction` and `useReverseTransaction` invalidate only affected keys: not all `accounts` and `cards` when source is one type, and not all `customers.outstanding` when one customer changed. Merge `web/lib/api/types.ts:1-75` to `z.infer` from `@repo/schemas` so types do not drift. Fix the no-op 401 interceptor or move redirect to one place (`auth-provider` or `AuthGuard`, not both).

## Acceptance criteria

- [ ] One module owns `queryKeys`, `queries`, and `mutations` for hisab domain; 12 files collapsed or clearly re-export from the deep module
- [ ] Port `HisabData` with methods `listTransactions`, `getOutstanding`, `createTransaction`, etc., has HTTP and in-memory implementations
- [ ] `queryKeys` serialize filters deterministically; changing filter keys updates one place
- [ ] Mutations invalidate precisely: card-only transaction does not invalidate `accounts.all`, one customer change does not invalidate all `customers`
- [ ] `web/lib/api/types.ts` derived from Zod (`z.infer<typeof createTransactionSchema>`) or deleted; no manual duplication
- [ ] 401 handling lives in one place and is tested via in-memory adapter; web has at least one boundary test for optimistic or refetch behavior

## Blocked by

- Blocked by `issues/002-ledger-transaction-service.md`
- Blocked by `issues/004-validation-dto-auth.md`

## User stories addressed

- US5
