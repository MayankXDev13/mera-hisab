import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { RepoError } from "@repo/db";

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}
function toRateBps(pct: number) {
  return Math.round(pct * 100);
}
async function outstandingPaise(customerId: string): Promise<number> {
  const repo = getRepo();
  const list = await repo.transactions.list({ customerId });
  let out = 0;
  for (const t of list) {
    if (t.direction === "debit") out += t.amountPaise;
    else out -= t.amountPaise;
  }
  return out;
}

export async function listCustomers(req: Request, res: Response) {
  const repo = getRepo();
  const qRaw = (req.validated?.query as { q?: string } | undefined)?.q ?? (req.query.q as string | undefined);
  const q = qRaw?.toLowerCase();
  let list = await repo.customers.list();
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q));
  const withOutstanding = await Promise.all(list.map(async (c) => ({ ...c, outstandingPaise: await outstandingPaise(c.id) })));
  res.json(withOutstanding);
}

export async function createCustomer(req: Request, res: Response) {
  const body = req.body as { name: string; username: string; email?: string | null; phone?: string | null; notes?: string | null; monthlyRatePct: number };
  const repo = getRepo();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const cust = await repo.customers.create({
      id,
      name: body.name,
      username: body.username,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      monthlyRateBps: toRateBps(body.monthlyRatePct),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await repo.audit.write({
      actorId: actor(req),
      action: "customer.create",
      entityType: "customer",
      entityId: id,
      before: null,
      after: JSON.stringify(cust),
    });
    res.status(201).json(cust);
  } catch (e: unknown) {
    if (e instanceof RepoError && e.statusCode === 409) return res.status(409).json({ error: "username already exists" });
    throw e;
  }
}

export async function getCustomer(req: Request, res: Response) {
  const repo = getRepo();
  const cust = await repo.customers.get(String((req.params as Record<string, string>).id));
  if (!cust) return res.status(404).json({ error: "not found" });
  res.json({ ...cust, outstandingPaise: await outstandingPaise(cust.id) });
}

export async function updateCustomer(req: Request, res: Response) {
  const repo = getRepo();
  const cust = await repo.customers.get(String((req.params as Record<string, string>).id));
  if (!cust) return res.status(404).json({ error: "not found" });
  const body = req.body as { name?: string; username?: string; email?: string | null; phone?: string | null; notes?: string | null; monthlyRatePct?: number };
  const before = { ...cust };
  try {
    const updated = await repo.customers.update(cust.id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.username !== undefined ? { username: body.username } : {}),
      ...(body.email !== undefined ? { email: body.email ?? null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone ?? null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
      ...(body.monthlyRatePct !== undefined ? { monthlyRateBps: toRateBps(body.monthlyRatePct) } : {}),
    });
    await repo.audit.write({
      actorId: actor(req),
      action: "customer.update",
      entityType: "customer",
      entityId: cust.id,
      before: JSON.stringify(before),
      after: JSON.stringify(updated),
    });
    res.json(updated);
  } catch (e: unknown) {
    if (e instanceof RepoError && e.statusCode === 409) return res.status(409).json({ error: "username already exists" });
    throw e;
  }
}

export async function deactivateCustomer(req: Request, res: Response) {
  const repo = getRepo();
  const cust = await repo.customers.get(String((req.params as Record<string, string>).id));
  if (!cust) return res.status(404).json({ error: "not found" });
  const before = { ...cust };
  const updated = await repo.customers.update(cust.id, { status: "deactivated" });
  await repo.audit.write({
    actorId: actor(req),
    action: "customer.deactivate",
    entityType: "customer",
    entityId: cust.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json(updated);
}
