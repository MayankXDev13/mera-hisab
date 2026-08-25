# 007: Monthly charge job with compounding

## Parent PRD

`issues/prd.md`

## What to build

Automate the monthly percentage charge. A node-cron job runs at 00:05 IST on the 1st of each month, timezone stated explicitly in config. For each active customer with nonzero outstanding, it computes base as current outstanding including prior unpaid charges, applies the customer's monthly_rate_pct snapshot taken at run time, and posts a CHARGE transaction linked to a monthly_charges row recording period month, rate snapshot, base amount, and charge amount. The unique constraint on customer_id plus period_month makes reruns harmless: running the job twice in a month posts each customer's charge exactly once.

Charges become part of outstanding, so next month's base includes them. That is the compounding behavior agreed in the PRD.

UI: charges visible per customer (month, rate, base, amount) on the customer record's charges tab, and a simple all-charges list grouped by month so anomalies stand out. Include a manual trigger endpoint for testing and for catching up if the server was down on the 1st; idempotency keeps it safe.

Testing uses a fixed clock: consecutive months compound correctly, double-run posts once, customers at zero outstanding get no charge.

## Acceptance criteria

- [ ] Job runs on schedule with IST timezone explicit in configuration
- [ ] Charge equals base times rate snapshot, rounded deterministically in paise
- [ ] Base includes prior unpaid charges, proving compounding across months
- [ ] Unique constraint prevents double-posting for the same customer and month
- [ ] Manual trigger endpoint exists behind auth and respects the same idempotency
- [ ] Customers with zero outstanding produce no charge rows
- [ ] Charges appear per customer with month, rate, base, and amount
- [ ] Fixed-clock integration tests: two consecutive months compound, rerun posts nothing extra, zero-balance customers skipped
- [ ] Each posted charge writes an audit row

## Blocked by

- Blocked by `issues/006-transaction-ledger-engine.md`

## User stories addressed

- User story 18
- User story 19
- User story 20
- User story 21
