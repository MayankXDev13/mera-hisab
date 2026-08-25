# 008: Charge waivers via reversing adjustments

## Parent PRD

`issues/prd.md`

## What to build

When a customer asks, the admin can remove or shrink a past month's charge. Full waiver flips the charge's status and posts a reversing adjustment for the exact amount. Partial reduction records the waived portion, posts the adjustment for that portion, and marks status reduced. Original charge rows are never edited; the adjustment trail tells the whole story.

UI lives on the charges review page grouped by month: each charge row gets waive and reduce actions with a confirmation step showing exactly what will be posted. Reduced charges show original amount, waived amount, and effective charge. Waived portions stop contributing to future compounding bases automatically since they reverse out of outstanding.

Validation: cannot waive more than the charge amount, cannot touch already fully waived charges, adjustments always link back to their charge row.

## Acceptance criteria

- [ ] Full waiver reverses the entire charge out of outstanding and marks it waived
- [ ] Partial reduction reverses only the specified portion and marks it reduced
- [ ] Original charge rows keep their original values; adjustments link to them
- [ ] Waiving more than the charge amount is impossible through both API and UI
- [ ] Already-waived charges reject further waivers
- [ ] Future month bases exclude waived portions, verified by test
- [ ] Confirmation dialog states the exact adjustment before posting
- [ ] Integration tests: full waiver math, partial reduction math, double-waive rejection, compounding exclusion after waiver
- [ ] Every waiver writes an audit row naming actor and affected customer

## Blocked by

- Blocked by `issues/007-monthly-charge-job.md`

## User stories addressed

- User story 22
- User story 23
- User story 24
