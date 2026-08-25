# Mera Hisab: private lending ledger

## Problem statement

I lend money to customers from my own bank accounts and credit cards. Right now I track all of it by hand: who owes what, which account each disbursement came from, how much of a card's limit I've used, and what monthly charges customers owe me. Manual tracking drifts. I want one place where every rupee given, received, and charged gets logged, with a trail I can trust when a customer disputes something six months later.

## Solution

Mera Hisab is an admin-only web app. I log in and manage everything from there. Customers never log in; they're records in my ledger.

The app tracks savings and current accounts with running balances, credit cards with limits that adjust automatically as I lend or get repaid, and a transaction log for money given and received. Each month a job applies a per-customer percentage charge on outstanding balance, compounding like we agreed. If a customer asks me to drop or shrink last month's charge, I can do that too, and the waiver is recorded rather than erased. A dashboard sums up where I stand, every change lands in an audit log, and I can export CSVs or print a customer statement. Everything is in rupees.

## User stories

1. As an admin, I want to log in with email and password, so only I can touch the ledger.
2. As an admin, I want my session to persist securely and to log out, so access stays controlled.
3. As an admin, I want to add savings or current accounts with a name and opening balance, so my sources of funds are recorded.
4. As an admin, I want to edit or deactivate accounts, so closed accounts disappear from new entries without losing history.
5. As an admin, I want to see each account's current balance, so I know how much I can still lend from it.
6. As an admin, I want to add credit cards with issuer, last four digits, and total limit, so every lending source lives in one place.
7. As an admin, I want a card's used amount to rise when I lend from it, so available limit stays accurate without mental math.
8. As an admin, I want a card's used amount to fall when repayment comes back through it, so limit restores on its own.
9. As an admin, I want the app to refuse disbursements above a card's available limit, so I never over-lend from a card by mistake.
10. As an admin, I want to add a customer with name, username, email, phone, notes, and monthly charge rate, so borrower records are complete.
11. As an admin, I want to edit customer details and rates later, so records stay current when terms change.
12. As an admin, I want to record giving credit with amount, date, source, and note, so every disbursement has a paper trail.
13. As an admin, I want the source balance to drop in the same database write as the transaction, so balances never drift from reality.
14. As an admin, I want to record repayments with amount, date, destination, and note, so outstanding falls correctly.
15. As an admin, I want each customer's running outstanding visible at a glance, so I always know who owes what.
16. As an admin, I want a full transaction history per customer, so disputes get settled in minutes, not evenings of digging.
17. As an admin, I want to fix a wrong entry through reversal rather than silent edits, so history stays honest even after mistakes.
18. As an admin, I want a different monthly rate per customer, since not everyone borrowed on the same terms.
19. As an admin, I want charges posted automatically on the 1st of each month, so I stop computing them in a spreadsheet.
20. As an admin, I want unpaid charges counted into next month's base, because that's the deal I made.
21. As an admin, I want each charge to show its month, rate, base, and amount, so I can explain any figure to the customer who questions it.
22. As an admin, I want to remove a previous charge completely when a customer asks, so goodwill gestures are possible.
23. As an admin, I want to reduce a previous charge by part, so partial waivers work too.
24. As an admin, I want waivers recorded as adjusting entries, so the ledger shows what happened instead of hiding it.
25. As an admin, I want totals for disbursed, received, charged, and outstanding, so I see business health in one screen.
26. As an admin, I want per-source breakdown showing account balances and card usage, so I know my liquidity before promising money.
27. As an admin, I want every change written to an audit log with actor, action, entity, before, after, and time, so nothing changes untraceably.
28. As an admin, I want to filter and search the audit log, so investigating an incident takes one lookup.
29. As an admin, I want CSV export of transactions filtered by customer, date range, and source, so my CA can work with the data.
30. As an admin, I want CSV exports of customers and charges, so raw backups exist outside the app.
31. As an admin, I want a PDF statement per customer with transactions, charges, and running balance, so I can hand the customer a clean record.
32. As an admin, I want amounts stored as paise and shown as ₹1,23,456, so figures stay exact.
33. As an admin, I want input validation everywhere, so a typo can't put garbage in the ledger.

## Implementation decisions

Turborepo monorepo. Two apps: an Express API in TypeScript and a Next.js frontend. A shared package holds types and zod schemas, another holds the Drizzle schema and client. Database is Supabase Postgres. Money is stored as integer paise throughout, never floats.

Auth uses Better Auth with email, password, and session cookies. One role today. The users table carries a roles column anyway so an owner-over-admin split can come later without a migration headache.

Tables: users, accounts (name, type savings or current, opening balance, current balance, status), credit_cards (issuer, last4, total limit paise, used paise, status), customers (name, unique username, email, phone, notes, monthly_rate_pct, status), transactions (direction debit or credit, amount paise, customer id, source_type account or credit_card, source_id, occurred_at, note, created_by), monthly_charges (customer_id, period_month, rate_snapshot, base_amount_paise, charge_amount_paise, status applied, waived, or reduced, waived_amount_paise), audit_logs (actor_id, action, entity_type, entity_id, before jsonb, after jsonb, created_at).

The transactions module is the core. It exposes one function, postTransaction, which takes direction, customer, source, and amount. Inside a single database transaction it checks funds or limit, updates the account balance or card usage, inserts the row, and writes the audit entry. Callers see one simple interface; all the consistency logic hides behind it. That makes it easy to test and impossible for other modules to update balances directly and skip the rules.

A node-cron job runs at 00:05 IST on the 1st. For each active customer with nonzero outstanding, base equals outstanding including prior unpaid charges, then the charge posts at the customer's rate snapshot. A unique constraint on customer_id plus period_month keeps reruns from double-posting.

Waivers never edit original rows. Removing or reducing a charge posts a reversing adjustment and flips the monthly_charges status. The original stays untouched.

CSV files stream from the server. PDF statements render server side per customer.

REST API under /api/v1, bodies validated with zod, types shared between apps. Frontend pages: login, dashboard, accounts, cards, customers (with statement and charges tabs), transactions list and entry form, monthly charges review with waiver actions, audit log, exports.

## Testing decisions

Good tests check external behavior only: what the API returns and what ends up in the database. Internal calls stay untested.

Vitest integration tests cover three areas. The transactions service gets the deepest coverage because it's where money math goes wrong: posting a debit drops the source exactly by the amount, an over-limit card disbursement fails with zero partial writes, and deleting an entry reverses its effect. The charge engine uses a fixed clock: compounding across consecutive months, running twice posts once, and a waived month stops contributing to future bases. Auth guards reject anonymous requests on every mutating route.

No prior art exists since this is greenfield, so Vitest plus Supertest patterns start in apps/api from day one.

## Out of scope

Customer login or portal. Interest beyond the flat monthly percent, so no EMI schedules or daily reducing balance. Multi-currency. Payment reminders by SMS or email. Multiple admin roles. Mobile apps.

## Further notes

Admin and owner are the same login today. The roles column keeps the door open for hierarchy later. The cron job must state its timezone explicitly, since month boundaries depend on IST. Supabase credentials come from env vars and never enter the repo.
