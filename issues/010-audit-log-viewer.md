# 010: Audit log viewer

## Parent PRD

`issues/prd.md`

## What to build

A read-only screen over the audit trail that slices since 003 have been writing. Lists audit entries newest first showing timestamp, acting admin, action, entity type, and entity identifier. Filters narrow by action type, entity type, entity id, actor, and date range; text search matches entity ids. Row expansion shows the before and after snapshots side by side with changed fields highlighted, rendered readably (pretty-printed JSON with field labels, not raw blobs).

Strictly read-only: the API exposes no update or delete routes for audit rows, and the table carries no such code paths. Pagination handles growth since every mutation adds rows forever.

## Acceptance criteria

- [ ] Viewer lists entries newest first with actor, action, entity, and timestamp
- [ ] Filters work combined: action plus entity plus date range narrows correctly
- [ ] Expanded row shows before/after diff with changed fields visually marked
- [ ] No API route mutates or deletes audit rows; enforced in tests attempting exactly that
- [ ] Paginated loading stays fast past thousands of rows
- [ ] Access restricted to logged-in admin

## Blocked by

- Blocked by `issues/003-accounts-crud-audit-foundation.md`

## User stories addressed

- User story 27
- User story 28
