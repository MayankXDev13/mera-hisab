# 009: Summary dashboard

## Parent PRD

`issues/prd.md`

## What to build

One screen answering "where do I stand". Top-level totals computed from the ledger: total disbursed, total received, total charges posted, total waived off, and net outstanding across all customers. Below that, per-source breakdown: every active account with current balance, every active card with limit, used, and available, plus utilization bars for cards. And a per-customer outstanding list sorted largest first, so the biggest exposures lead.

Aggregations run as SQL sums over transactions rather than looping in application code, keeping the dashboard correct even as data grows. Numbers format as ₹ with Indian digit grouping. Empty state reads sensibly before any data exists.

## Acceptance criteria

- [ ] Totals match hand-computed sums from the transactions table exactly, including charges and waivers
- [ ] Per-source section shows live balances and card utilization matching the source tables
- [ ] Customer list sorts by outstanding descending and links to each customer page
- [ ] Aggregations implemented as SQL sum queries, not application-side loops
- [ ] Dashboard loads under auth only
- [ ] Empty-state view renders cleanly with no data
- [ ] Test seeds known data and asserts every dashboard figure against expected values

## Blocked by

- Blocked by `issues/006-transaction-ledger-engine.md`

## User stories addressed

- User story 25
- User story 26
