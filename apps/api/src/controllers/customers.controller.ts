import { z } from "zod";
import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { RepoError } from "@repo/db";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "invalid username"),
  email: z.string().email().nullable().optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  monthlyRatePct: z.number().min(0).max(100),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "invalid username").optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  monthlyRatePct: z.number().min(0).max(100).optional(),
});

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
  const q = (req.query.q as string | undefined)?.toLowerCase();
  let list = await repo.customers.list();
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q));
  const withOutstanding = await Promise.all(list.map(async (c) => ({ ...c, outstandingPaise: await outstandingPaise(c.id) })));
  res.json(withOutstanding);
}

export async function createCustomer(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const repo = getRepo();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const cust = await repo.customers.create({
      id,
      name: parsed.data.name,
      username: parsed.data.username,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      notes: parsed.data.notes ?? null,
      monthlyRateBps: toRateBps(parsed.data.monthlyRatePct),
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
  const cust = await repo.customers.get(String((req.params as Record<string,string>).id));
  if (!cust) return res.status(404).json({ error: "not found" });
  res.json({ ...cust, outstandingPaise: await outstandingPaise(cust.id) });
}

export async function updateCustomer(req: Request, res: Response) {
  const repo = getRepo();
  const cust = await repo.customers.get(String((req.params as Record<string,string>).id));
  if (!cust) return res.status(404).json({ error: "not found" });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const before = { ...cust };
  try {
    const updated = await repo.customers.update(cust.id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.username !== undefined ? { username: parsed.data.username } : {}),
      ...(parsed.data.email !== undefined ? { email: parsed.data.email ?? null } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone ?? null } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes ?? null } : {}),
      ...(parsed.data.monthlyRatePct !== undefined ? { monthlyRateBps: toRateBps(parsed.data.monthlyRatePct) } : {}),
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
  const cust = await repo.customers.get(String((req.params as Record<string,string>).id));
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
