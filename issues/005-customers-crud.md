# 005: Customers CRUD with monthly rate

## Parent PRD

`issues/prd.md`

## What to build

Customers become ledger records. The customers table stores name, unique username, email, phone, notes, monthly_rate_pct, and status. No login, no password; customers exist purely as data. CRUD API and UI: searchable customer list, create/edit form, deactivate for retired borrowers. Monthly rate accepts decimals like 2.5 and validates the range.

Outstanding balance is not built here; the transactions slice introduces it. This slice keeps the customer detail page minimal, ready for statement and charges tabs to land on top of it later.

## Acceptance criteria

- [ ] Admin can create a customer with name, username, email, phone, notes, and monthly rate
- [ ] Username uniqueness enforced with a clear duplicate error
- [ ] Email validated as an email; phone validated loosely (digits, optional +)
- [ ] Monthly rate accepts decimal percentages within a sane bound (0 to 100) and rejects junk
- [ ] Search filters the list by name, username, or email
- [ ] Deactivated customers hide from transaction forms but keep their records
- [ ] Audit rows written for every mutation via the shared audit helper
- [ ] Integration tests: CRUD round-trip, duplicate username rejection, validation errors

## Blocked by

- Blocked by `issues/002-better-auth-login.md`

## User stories addressed

- User story 10
- User story 11
