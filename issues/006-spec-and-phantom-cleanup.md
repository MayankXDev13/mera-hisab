## Parent PRD

`issues/prd.md`

## What to build

Generate the spec from the source of truth and remove phantom code. Replace `apps/api/src/docs/openapi.ts:1-422` hand-written literal with generation from Zod schemas (e.g., `zod-to-openapi` or similar) so `AccountCreate`, `TransactionCreate`, and `amountPaise xor amountRupees` never drift. Generate `apps/web/lib/api/types.ts` from the same source or share `z.infer`. Decide on `packages/db/src/schema/monthlyCharges.ts:18-44` and `transactions.monthlyChargeId` FK: either wire the charge engine (cron, validation that charge belongs to customer, unique per month) or delete the table and column and the `monthlyChargeId` passthrough in `packages/schemas/src/transactions.ts:17` and `transactions.controller.ts:82,123`. Remove or wire `@repo/ui` stub (`packages/ui/src/button.tsx`, `card.tsx`) so `web` does not carry an unused dep.

## Acceptance criteria

- [ ] `GET /api/openapi.json` output matches Zod schemas; adding a field to `customers` updates spec without manual edit
- [ ] Web API types are generated or inferred, not hand-copied; rename `monthlyRateBps` touches one definition
- [ ] `monthlyCharges` either has a tested owner (route, service, cron, or validation) or is deleted with migration that drops FK and column
- [ ] `@repo/ui` is either consumed by `web` or deleted from `pnpm-workspace.yaml` and `package.json`
- [ ] `emptyDirectory` `apps/api/src/utils/` either holds extracted helpers or is removed
- [ ] Tests assert spec equals schemas (snapshot or contract test) and that phantom routes return 404 if deleted

## Blocked by

- Blocked by `issues/004-validation-dto-auth.md`

## User stories addressed

- US6
- US7
