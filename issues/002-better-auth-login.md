# 002: Admin authentication with Better Auth

## Parent PRD

`issues/prd.md`

## What to build

Admin-only login so nobody anonymous can touch the ledger. Better Auth configured on the Express API with email and password, session cookies, and the users table it manages. Login page on the Next.js side, logout action, and middleware on both sides: unauthenticated requests to mutating or private API routes get rejected, and unauthenticated visits to app pages redirect to login. A seed path exists to create the first admin (CLI script or first-run signup) since there is no self-service registration.

The users table carries a roles column defaulting to `admin`, unused today but present per the PRD's further notes.

## Acceptance criteria

- [ ] Admin can log in with email and password and lands on a protected home shell
- [ ] Session persists across browser restarts until logout
- [ ] Logout clears the session and redirects to login
- [ ] Anonymous API requests to protected routes return 401; anonymous page visits redirect to login
- [ ] A script seeds the first admin without exposing registration in the UI
- [ ] Users table includes a roles column defaulting to admin
- [ ] Passwords hashed by Better Auth; no plaintext anywhere including logs
- [ ] Integration test: login succeeds with correct credentials, fails with wrong ones, protected route rejects anonymous access

## Blocked by

- Blocked by `issues/001-turborepo-scaffold.md`

## User stories addressed

- User story 1
- User story 2
