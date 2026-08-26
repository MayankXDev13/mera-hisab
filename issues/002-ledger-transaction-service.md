## Parent PRD

`issues/prd.md`

## What to build

Extract ledger writes into a deep `ledgerService` that hides balance checks, DB transaction boundaries, and audit writes. Move `createTransaction:28-146` and `reverseTransaction:148-221` out of `apps/api/src/controllers/transactions.controller.ts` into `apps/api/src/services/ledger.service.ts` with injected `db` and `actorId`. Deduplicate the four `if(sourceType==="account")` branches into `applyAccountDelta` and `applyCardDelta` helpers. Keep controllers thin: they read `validatedBody`, call `ledgerService.create(...)`, map errors with typed `LedgerError(statusCode)`, and return `toTransactionDto`. Handle `monthlyChargeId` passthrough validation or document as phantom if left.

## Acceptance criteria

- [ ] `ledger.service.ts` owns `resolveAmount`, balance checks, `db.transaction`, failed balance errors as typed errors, and `auditLogs` inserts; controllers are under 40 lines each
- [ ] No `const db:any = _db` and no `Object.assign(new Error, {statusCode})` in service; errors are typed classes or discriminated unions
- [ ] Duplication removed: account and card balance logic lives in one place each, shared by create and reverse
- [ ] Boundary tests with pglite or pg-mem cover debit account sufficient/insufficient, credit, card limit, deactivated, amountRupees string, reversal inverts, and actorId null case
- [ ] Existing `apps/api/tests/transactions.test.ts` proxy mock replaced by service boundary tests; supertest smoke test remains but does not need 230-line proxy
- [ ] TOCTOU noted: if not fixing `FOR UPDATE` now, add a test or comment that documents the isolation gap

## Blocked by

- Blocked by `issues/001-money-single-source.md`

## User stories addressed

- US2
