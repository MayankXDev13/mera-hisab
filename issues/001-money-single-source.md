## Parent PRD

`issues/prd.md`

## What to build

Unify money handling into one deep module. Today `rupeesToPaise` and `formatRupees` live in both `packages/schemas/src/common.ts:23-41` and `apps/web/lib/utils/format.ts:1-21` with subtle drift, and `AmountInput` plus `resolveAmount` in `apps/api/src/controllers/transactions.controller.ts:14-26` add two more validation layers. Create a single `@repo/money` or consolidate to `@repo/schemas` that both api and web import. Hide parsing, sign handling, int32 guard, and INR formatting behind a small interface. Update all call sites: schemas, controllers, `amount-input.tsx`, `transaction-form.tsx`, and shared `formatRupees` usage.

## Acceptance criteria

- [ ] One `rupeesToPaise(input: string | number) => number` and `formatRupees(paise: number) => string` plus `parseAmount(body) => number | null` exported from a single package and used by both `apps/api` and `apps/web`
- [ ] `apps/web/lib/utils/format.ts` re-exports or is deleted, no fork remains; `grep rupeesToPaise` shows one definition
- [ ] `AmountInput` and `transactions.controller.ts:resolveAmount` delegate to shared parse, keep only UI regex if needed but consistent with shared logic
- [ ] Edge cases covered: `""`, `"abc"`, `"-0.5"`, `"0.50"`, `2147483647`, `0`, and max int32 guard behaves same in api and web
- [ ] Existing `apps/api/tests/schemas.test.ts` expanded and passes, plus web can import the same tests or a shared test suite
- [ ] No behavior change to `POST /api/transactions` validation messages beyond unifying NaN handling

## Blocked by

None - can start immediately

## User stories addressed

- US1
