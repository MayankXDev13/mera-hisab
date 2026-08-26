# PRD: Mera Hisab Architecture Deepening

## Overview
Mera Hisab is a lending ledger. The codebase grew as shallow modules. One concept fans out across many tiny files. Changing money semantics, transaction flow, or query filters touches 4-8 places. Tests mock the DB with a 230-line proxy, and the web has no tests. This PRD captures six deepening opportunities to make modules deep, testable, and AI-navigable.

## Goals
- One source of truth for money, types, and validation.
- Ledger writes and queries as deep modules with boundary tests.
- Typed request context, no `as unknown` casts.
- Frontend data layer with explicit ports, stable invalidation.
- SQL pushdown for pagination and outstanding.

## User stories

### US1: Money stays consistent
As a developer, I change rupee to paise logic in one place and web and api both pick it up, so amounts never drift between client and server.

### US2: Ledger write is safe
As a lender, when I debit an account or card, the balance check and update happen atomically, reversal inverts correctly, and audit is written, even under concurrent writes.

### US3: Ledger queries scale
As a lender with thousands of transactions, I can filter by date and page results without loading the whole table, and outstanding computes as SUM in SQL, not JS loops, and the customer list does not fire N requests.

### US4: Request context is typed
As a developer, I read `req.validatedBody` and `req.user` with types, not casts, and auth does not force a DB connection at import time, so new routes are easy to test.

### US5: Web data is coherent
As a user, creating a transaction updates only the affected account or card and customer outstanding, and the web types match the API, so stale data and type drift do not happen.

### US6: Spec is generated
As a developer, OpenAPI and web API types are generated from Zod and Drizzle, so the spec never drifts from implementation.

### US7: Dead code is gone
As a maintainer, monthlyCharges and @repo/ui stubs are either wired or removed, so migrations and deps do not carry phantom tables.

## Constraints
- Keep `better-auth` and `drizzle-orm` unless a slice explicitly replaces them.
- Postgres stays the source of truth. Use pglite or pg-mem for local tests where DB is needed.
- No breaking change to `POST /api/transactions` and `GET /customers/:id/outstanding` response shapes without a migration note.

## Out of scope
- Full UI redesign.
- Replacing Next.js or Express.

## Success criteria
- One `rupeesToPaise` and `formatRupees` implementation imported by both apps.
- `createTransaction` and `reverseTransaction` live in a service with injected DB, tested with pglite.
- `listTransactions` pushes from/to to SQL and uses LIMIT/OFFSET.
- `getOutstanding` uses SQL SUM and a batch endpoint or query avoids N+1.
- `validateBody` augments `Express.Request` types, `getActor` is one function, `dto` hides internals.
- Web queries use stable keys and targeted invalidation; types are `z.infer`.
- OpenAPI is generated, not hand-written.
