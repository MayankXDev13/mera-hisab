# 003: Accounts CRUD with audit logging foundation

## Parent PRD

`issues/prd.md`

## What to build

Savings and current accounts become manageable end-to-end. The accounts table stores name, type (savings or current), opening balance paise, current balance paise, and status. API routes for create, list, edit, and deactivate under auth guard. UI page listing accounts with balances formatted as rupees, a create/edit form, and deactivate instead of delete so closed accounts vanish from new-entry dropdowns while keeping history.

This slice also builds the audit-log helper: an internal function that writes actor, action, entity type, entity id, before jsonb, after jsonb, and timestamp for every account mutation. Every later slice reuses this helper, so it must be done here first. Deactivated accounts stop appearing in pickers but remain queryable.

## Acceptance criteria

- [ ] Admin can create an account with name, type, and opening balance; current balance starts equal to opening balance
- [ ] Amounts stored as integer paise; UI shows ₹ formatting like ₹1,23,456
- [ ] Admin can edit account details and balance updates reflect immediately
- [ ] Deactivating hides the account from new-entry flows but keeps it listed with a deactivated state
- [ ] Every create, update, and deactivate writes one audit row with before/after snapshots and acting user
- [ ] All inputs validated with shared zod schemas; invalid input returns field-level errors
- [ ] Audit helper rejects writes missing actor or entity info rather than logging partial rows
- [ ] Integration tests: CRUD round-trip, deactivation behavior, audit row written for each mutation

## Blocked by

- Blocked by `issues/002-better-auth-login.md`

## User stories addressed

- User story 3
- User story 4
- User story 5
- User story 27 (partial - write path only; viewer comes in issue 010)
