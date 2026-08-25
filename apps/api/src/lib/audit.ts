import { store, nowIso, newId } from "./store.js";

export function writeAudit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown | null;
  after: unknown | null;
}) {
  if (!params.action || !params.entityType || !params.entityId) {
    throw new Error("audit: missing required fields");
  }
  if (!params.actorId) {
    throw new Error("audit: missing actorId");
  }
  store.auditLogs.push({
    id: newId(),
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before != null ? JSON.stringify(params.before) : null,
    after: params.after != null ? JSON.stringify(params.after) : null,
    createdAt: nowIso(),
  });
}
