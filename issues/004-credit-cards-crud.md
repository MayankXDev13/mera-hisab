# 004: Credit cards CRUD with limit tracking

## Parent PRD

`issues/prd.md`

## What to build

Credit cards join accounts as lending sources. The credit_cards table stores issuer, last4 digits, total limit in paise, used amount in paise starting at zero, and status. Full CRUD under auth guard with the same deactivate-not-delete rule. UI lists each card with total limit, used amount, and computed available limit (limit minus used), plus issuer and last four digits. Card usage changes only through transactions in a later slice; this slice just records and displays limits accurately.

Validation enforces sane data: last4 exactly four digits, limit positive, used never exceeding limit even manually.

## Acceptance criteria

- [ ] Admin can add a card with issuer, last4, and total limit
- [ ] List shows available limit computed as total limit minus used, in ₹ formatting
- [ ] Editing limit works; editing cannot set used above limit
- [ ] Deactivated cards drop out of source pickers but stay listed
- [ ] Last4 validation rejects anything other than exactly four digits
- [ ] Audit rows written for every card mutation via the shared audit helper
- [ ] Integration tests: CRUD round-trip, available-limit computation, validation failures

## Blocked by

- Blocked by `issues/002-better-auth-login.md`

## User stories addressed

- User story 6
