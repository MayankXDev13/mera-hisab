# api-005: Auth and audit identity — Better Auth migration

## Problem

`apps/api/src/lib/auth.ts` implements custom JWT with `JWT_SECRET ?? "dev-secret-change-me"`, `secure: false`, `sameSite: lax`, 7 day expiry, and `authMiddleware` that mutates `(req as any).user`. `requireAuth` only checks presence, never `role` from `users.role` in `packages/db/src/schema/index.ts` or `apps/api/src/lib/store.ts`. `verifyToken` returns null for both expired and malformed. `apps/api/src/lib/audit.ts` throws when `actorId` is null, yet `apps/api/src/index.ts` cron calls `runMonthlyCharges({ actorId: null })`. `apps/web/middleware.ts` redirects on cookie presence without `jwt.verify`, so a fake cookie passes. `ensureSeedAdmin` at `apps/api/src/index.ts` duplicates `apps/api/src/seed.ts`, both writing to the Map.

The schema already contains Better Auth tables (`users`, `sessions`, `accounts_auth`, `verifications`) at `packages/db/src/schema/index.ts` but they are unused.

## Proposed Interface

Replace custom JWT with Better Auth wired to Drizzle, keep the middleware shape callers know.

```ts
// apps/api/src/lib/auth.ts
export type Auth = {
  signUp(email: string, password: string): Promise<User>
  verify(email: string, password: string): Promise<User | null>
  middleware(): RequestHandler
  requireAuth(): RequestHandler
  requireRole(role: string): RequestHandler
}

export function createAuth(deps: { db: Db, baseURL: string, secret: string, cookieName?: string }): Auth

// audit no longer throws on system
export function writeAudit(entry: { actorId: string | null, action: string, entityType: string, entityId: string, before: unknown, after: unknown }): Promise<void>
```

App wiring:

```ts
const auth = createAuth({ db: getDb()!, baseURL: process.env.WEB_URL!, secret: process.env.BETTER_AUTH_SECRET! })
app.use(auth.middleware())
app.use("/api/v1/accounts", auth.requireAuth(), accountsRouter)
```

What it hides: Better Auth session handling, cookie `mera_hisab_session` config, Drizzle adapter, password hashing, token verify. What it exposes: `middleware`, `requireAuth`, `requireRole`, and a forgiving `writeAudit`.

## Dependency Strategy

**Ports and adapters.** Port is `Auth` above. Production adapter is Better Auth with Drizzle against `packages/db/src/schema/index.ts` tables. Test adapter creates sessions directly via the repo or uses Better Auth test helpers against ephemeral Postgres. Earlier custom JWT is retired.

## Testing Strategy

- **New boundary tests to write**
  - anonymous `POST /accounts` is 401, authenticated is 200, wrong password is 401 with no leak
  - expired and malformed sessions both 401 but log distinct reasons
  - system job with `actorId: null` writes audit row as `system` without throw
  - `requireRole("admin")` hook can be added without changing other routes
  - seed twice does not duplicate `admin@example.com`

- **Old tests to delete**
  - any direct `store.usersByEmail` or `(req as any).user` mutation tests; test through middleware boundary

- **Test environment needs**
  - ephemeral Postgres via `getDb(url)`, Better Auth configured against it, `testcontainers` lifecycle

## Implementation Recommendations

- Own session and cookie logic inside Better Auth; do not read `JWT_SECRET` fallback. Require `BETTER_AUTH_SECRET` in production and fail fast.
- Hide `secure` and `sameSite` decisions behind env: `secure` true unless `NODE_ENV=development`.
- Expose `requireRole` as a thin wrapper so you can enforce `admin` later without churn.
- Migrate by unifying `ensureSeedAdmin` into a repo-based seeder that calls Better Auth or inserts via `users` table, replacing both `index.ts` and `seed.ts` paths. Update `apps/web/middleware.ts` to verify session, not just cookie presence, or document it as soft guard only.
