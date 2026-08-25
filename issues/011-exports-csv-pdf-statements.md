# 011: Exports: CSV downloads and PDF customer statements

## Parent PRD

`issues/prd.md`

## What to build

Data out of the app in shapes an accountant or a customer can use. Server-side CSV generation streamed as downloads for three datasets: transactions (filterable by customer, date range, source, and direction, same filters as the history list), customers, and monthly charges. Columns use clear headers and rupee amounts; paise stay exact in the data.

Per-customer PDF statement rendered server side: customer details, every transaction with date, direction, amount, source, and note, every charge with its month and status including waivers, running outstanding after each entry, and totals at the bottom. Statement covers all time by default with optional date-range bounds.

Exports page in the UI exposes each download behind auth. Large exports stream rather than buffering whole files in memory.

## Acceptance criteria

- [ ] Transactions CSV honors all four filters and matches the filtered list on screen exactly
- [ ] Customers CSV and charges CSV download with complete rows
- [ ] PDF statement lists transactions, charges with waiver status, running balance, and closing totals
- [ ] Statement figures reconcile against the dashboard totals for the same period
- [ ] Running balance in the statement is correct line by line
- [ ] Downloads require authentication
- [ ] A large dataset export streams without exhausting memory
- [ ] Tests parse a generated CSV and a generated PDF text layer asserting key figures

## Blocked by

- Blocked by `issues/006-transaction-ledger-engine.md`
- Blocked by `issues/007-monthly-charge-job.md`

## User stories addressed

- User story 29
- User story 30
- User story 31
