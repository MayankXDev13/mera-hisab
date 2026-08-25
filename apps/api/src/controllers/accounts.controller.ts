import { z } from "zod";
import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["savings", "current"]),
  openingBalancePaise: z.number().int().min(0),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(["savings", "current"]).optional(),
});

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listAccounts(_req: Request, res: Response) {
  const repo = getRepo();
  const list = await repo.accounts.list();
  res.json(list);
}

export async function createAccount(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const repo = getRepo();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const acc = await repo.accounts.create({
    id,
    name: parsed.data.name,
    type: parsed.data.type,
    openingBalancePaise: parsed.data.openingBalancePaise,
    currentBalancePaise: parsed.data.openingBalancePaise,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  await repo.audit.write({
    actorId: actor(req),
    action: "account.create",
    entityType: "account",
    entityId: id,
    before: null,
    after: JSON.stringify(acc),
  });
  res.status(201).json(acc);
}

export async function getAccount(req: Request, res: Response) {
  const repo = getRepo();
  const acc = await repo.accounts.get(String((req.params as Record<string,string>).id));
  if (!acc) return res.status(404).json({ error: "not found" });
  res.json(acc);
}

export async function updateAccount(req: Request, res: Response) {
  const repo = getRepo();
  const acc = await repo.accounts.get(String((req.params as Record<string,string>).id));
  if (!acc) return res.status(404).json({ error: "not found" });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const before = { ...acc };
  const updated = await repo.accounts.update(acc.id, {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
  });
  await repo.audit.write({
    actorId: actor(req),
    action: "account.update",
    entityType: "account",
    entityId: acc.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json(updated);
}

export async function deactivateAccount(req: Request, res: Response) {
  const repo = getRepo();
  const acc = await repo.accounts.get(String((req.params as Record<string,string>).id));
  if (!acc) return res.status(404).json({ error: "not found" });
  const before = { ...acc };
  const updated = await repo.accounts.update(acc.id, { status: "deactivated" });
  await repo.audit.write({
    actorId: actor(req),
    action: "account.deactivate",
    entityType: "account",
    entityId: acc.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json(updated);
}
