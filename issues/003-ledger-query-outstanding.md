## Parent PRD

`issues/prd.md`

## What to build

Make ledger reads scale by pushing work to SQL. Rewrite `listTransactions:223-262` to use `where` with `gte/lte` on `occurredAt` and `limit/offset` instead of loading all rows then filtering and slicing in JS. Rewrite `getOutstanding:125-137` to use `SUM(CASE WHEN direction='debit' THEN amountPaise ELSE -amountPaise END)` instead of JS loop. Add a batch outstanding path or cache so `apps/web/app/(app)/customers/page.tsx:32-38` `OutstandingCell` N+1 is replaced by one query. Keep response shapes `{transactions, total, page, limit}` and `{outstandingPaise}`.

## Acceptance criteria

- [ ] `listTransactions` generates SQL with `occurredAt >= from` and `<= to` when filters present, and uses `limit`/`offset`; in-memory `filter` and `slice` after fetch removed except for fallback
- [ ] `getOutstanding` executes one `SUM` query, not `select *` plus loop; handling of no rows returns 0
- [ ] Web customers page fetches outstanding without N requests; either new `GET /customers/outstanding?ids=` batch or server-computed join, and dashboard can show totalOutstanding without N+1
- [ ] Tests assert SQL pushdown (query count or pglite explain) and pagination correctness on seeded data over 50 rows
- [ ] No regression on sort order `desc(occurredAt)` and existing filter combos `customerId`, `sourceType`, `direction`

## Blocked by

- Blocked by `issues/002-ledger-transaction-service.md`

## User stories addressed

- US3
