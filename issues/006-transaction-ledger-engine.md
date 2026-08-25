# 006: Transaction ledger engine with atomic source updates

## Parent PRD

`issues/prd.md`

## What to build

The core of the product and the slice where money math must never go wrong. Build the postTransaction function: one entry point taking direction (debit means credit given to a customer, credit means repayment received), customer, source (account or credit card), amount, date, and note. Inside a single database transaction it validates the source can cover the amount, updates the account balance or the card's used amount, inserts the transactions row, and writes an audit entry. No other module may update balances or used amounts directly; this function owns that rule.

Debit from an account requires sufficient balance. Debit from a card requires available limit; over-limit is rejected with zero partial writes. Credit toward a card reduces its used amount, floored at zero. Every posting is integer paise.

UI: a new-transaction form (customer picker, direction, amount in rupees converted to paise, source picker filtered by direction, date, note) plus a transaction history list with filters by customer, date range, source, and direction. Customer detail page gains outstanding balance (debits minus credits) and full per-customer history. Wrong entries get fixed through reversal: a reversal posts the opposite direction linked to the original, never editing or deleting the row.

This is TDD territory: integration tests come first and drive the engine.

## Acceptance criteria

- [ ] Posting a debit drops the account balance exactly by the amount in the same DB transaction
- [ ] Posting a debit against a card raises its used amount exactly
- [ ] Over-limit card disbursement rejected atomically: no transaction row, no used-amount change, no audit row
- [ ] Insufficient account balance disbursement rejected the same way
- [ ] Repayment credit lowers card used amount but never below zero
- [ ] Repayment to an account raises its balance
- [ ] Reversal of a wrong entry posts an opposite entry linked to the original; originals are immutable
- [ ] Customer outstanding computed as debits minus credits, shown on the customer page
- [ ] History list filters correctly by customer, date range, source, and direction
- [ ] All money handled as paise; rupee input converts without float loss
- [ ] Audit rows written for every posting and reversal
- [ ] Integration tests cover every case above, including concurrent postings on one source

## Blocked by

- Blocked by `issues/003-accounts-crud-audit-foundation.md`
- Blocked by `issues/004-credit-cards-crud.md`
- Blocked by `issues/005-customers-crud.md`

## User stories addressed

- User story 7
- User story 8
- User story 9
- User stories 12 through 17
- User story 32
- User story 33
