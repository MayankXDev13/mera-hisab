## Parent PRD

`issues/prd.md`

## What to build

Replace shallow validation and DTO indirection with a typed request context. Augment `Express.Request` so `validateBody/Query/Params` writes to `req.validatedBody/Query/Params` with types, and delete `apps/api/src/lib/validate.ts:1-2` re-export. Deduplicate `getActor` into one `lib/actor.ts` or middleware that sets `req.user`. Replace `const db:any` casts and `req as unknown as {validatedBody}` everywhere. Make `to*Dto` the only mapping from DB row to API shape and keep `toIso` once. Use dependency injection for `db` so importing a controller does not eagerly open `postgres()` from `packages/db/src/db.ts:12-47`.

## Acceptance criteria

- [ ] `packages/schemas/src/validate.ts` exports typed middleware that augments `Express.Request`; controllers read `req.validatedBody` without casts
- [ ] `apps/api/src/lib/validate.ts` removed or re-export is intentional and documented; grep shows one import path for `validateBody`
- [ ] `getActor` lives in one module, tested, and handles `null` when session missing; four duplicates removed
- [ ] `toAccountDto`, `toCardDto`, `toCustomerDto`, `toTransactionDto` share a single `toIso` and are the only place that computes `availablePaise` and `Date→ISO`
- [ ] `db` is injected or accessed via a factory, not `const db:any = _db` at top level; new route test does not need `vi.mock("@repo/db")` ordering tricks
- [ ] Validation error shape for 422 stays consistent across routes, covered by unit tests

## Blocked by

- Blocked by `issues/001-money-single-source.md`

## User stories addressed

- US4
