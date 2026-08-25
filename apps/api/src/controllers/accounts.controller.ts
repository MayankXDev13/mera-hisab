import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { toAccountDto } from "../lib/dto.js";

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listAccounts(_req: Request, res: Response) {
  const repo = getRepo();
  const list = await repo.accounts.list();
  res.json(list.map(toAccountDto));
}

export async function createAccount(req: Request, res: Response) {
  const body = req.body as { name: string; type: "savings" | "current"; openingBalancePaise: number };
  const repo = getRepo();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const acc = await repo.accounts.create({
    id,
    name: body.name,
    type: body.type,
    openingBalancePaise: body.openingBalancePaise,
    currentBalancePaise: body.openingBalancePaise,
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
  res.status(201).json(toAccountDto(acc));
}

export async function getAccount(req: Request, res: Response) {
  const repo = getRepo();
  const acc = await repo.accounts.get(String((req.params as Record<string, string>).id));
  if (!acc) return res.status(404).json({ error: "not found" });
  res.json(toAccountDto(acc));
}

export async function updateAccount(req: Request, res: Response) {
  const repo = getRepo();
  const acc = await repo.accounts.get(String((req.params as Record<string, string>).id));
  if (!acc) return res.status(404).json({ error: "not found" });
  const body = req.body as { name?: string; type?: "savings" | "current" };
  const before = { ...acc };
  const updated = await repo.accounts.update(acc.id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.type !== undefined ? { type: body.type } : {}),
  });
  await repo.audit.write({
    actorId: actor(req),
    action: "account.update",
    entityType: "account",
    entityId: acc.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json(toAccountDto(updated));
}

export async function deactivateAccount(req: Request, res: Response) {
  const repo = getRepo();
  const acc = await repo.accounts.get(String((req.params as Record<string, string>).id));
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
  res.json(toAccountDto(updated));
}
