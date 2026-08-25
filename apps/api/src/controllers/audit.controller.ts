import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";

export async function listAudit(req: Request, res: Response) {
  const repo = getRepo();
  const { action, entityType, entityId, actorId, from, to, q, page, limit } = req.query as Record<string, string | undefined>;
  let list = await repo.audit.list({ action, entityType, entityId, from, to });
  if (actorId) list = list.filter((l) => l.actorId === actorId);
  if (q) list = list.filter((l) => l.entityId.includes(q) || l.action.includes(q));
  list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const p = Math.max(1, parseInt(page ?? "1", 10));
  const lim = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
  const start = (p - 1) * lim;
  res.json({ data: list.slice(start, start + lim), total: list.length, page: p, limit: lim });
}
