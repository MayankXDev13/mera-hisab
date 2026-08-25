import { Router } from "express";
import { z } from "zod";
import { store, newId, nowIso } from "../lib/store.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth } from "../lib/auth.js";

export const accountsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["savings","current"]),
  openingBalancePaise: z.number().int().min(0),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(["savings","current"]).optional(),
});

function actor(req: unknown) { return (req as { user:{id:string}}).user?.id ?? null; }

accountsRouter.use(requireAuth);

accountsRouter.get("/", (_req, res) => {
  res.json([...store.accounts.values()]);
});

accountsRouter.post("/", (req, res) => {
  const p = createSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const id = newId();
  const acc = { id, name: p.data.name, type: p.data.type, openingBalancePaise: p.data.openingBalancePaise, currentBalancePaise: p.data.openingBalancePaise, status: "active" as const, createdAt: nowIso(), updatedAt: nowIso() };
  store.accounts.set(id, acc);
  writeAudit({ actorId: actor(req), action: "account.create", entityType: "account", entityId: id, before: null, after: acc });
  res.status(201).json(acc);
});

accountsRouter.get("/:id", (req, res) => {
  const a = store.accounts.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  res.json(a);
});

accountsRouter.patch("/:id", (req, res) => {
  const a = store.accounts.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  const p = updateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const before = { ...a };
  if (p.data.name !== undefined) a.name = p.data.name;
  if (p.data.type !== undefined) a.type = p.data.type;
  a.updatedAt = nowIso();
  writeAudit({ actorId: actor(req), action: "account.update", entityType: "account", entityId: a.id, before, after: { ...a } });
  res.json(a);
});

accountsRouter.post("/:id/deactivate", (req, res) => {
  const a = store.accounts.get(req.params.id);
  if (!a) return res.status(404).json({ error: "not found" });
  const before = { ...a };
  a.status = "deactivated";
  a.updatedAt = nowIso();
  writeAudit({ actorId: actor(req), action: "account.deactivate", entityType: "account", entityId: a.id, before, after: { ...a } });
  res.json(a);
});
