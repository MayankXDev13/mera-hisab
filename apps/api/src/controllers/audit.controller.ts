import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";

export async function listAudit(req: Request, res: Response) {
  const repo = getRepo();
  const q = (req.validated?.query as Record<string, string | undefined> | undefined) ?? (req.query as Record<string, string | undefined>);
  let list = await repo.audit.list({ action: q.action, entityType: q.entityType, entityId: q.entityId, from: q.from, to: q.to });
  if (q.actorId) list = list.filter((l) => l.actorId === q.actorId);
  if (q.q) list = list.filter((l) => l.entityId.includes(q.q!) || l.action.includes(q.q!));
  list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const page = Number(q.page ?? 1);
  const limit = Number(q.limit ?? 20);
  const p = Math.max(1, page);
  const lim = Math.min(100, Math.max(1, limit));
  const start = (p - 1) * lim;
  res.json({ data: list.slice(start, start + lim), total: list.length, page: p, limit: lim });
}
