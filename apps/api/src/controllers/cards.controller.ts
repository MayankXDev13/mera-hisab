import { z } from "zod";
import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";

const createSchema = z.object({
  issuer: z.string().min(1).max(200),
  last4: z.string().regex(/^\d{4}$/, "last4 must be 4 digits"),
  totalLimitPaise: z.number().int().positive(),
});

const updateSchema = z.object({
  issuer: z.string().min(1).max(200).optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
  totalLimitPaise: z.number().int().positive().optional(),
});

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listCards(_req: Request, res: Response) {
  const repo = getRepo();
  res.json(await repo.cards.list());
}

export async function createCard(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const repo = getRepo();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const card = await repo.cards.create({
    id,
    issuer: parsed.data.issuer,
    last4: parsed.data.last4,
    totalLimitPaise: parsed.data.totalLimitPaise,
    usedPaise: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  await repo.audit.write({
    actorId: actor(req),
    action: "card.create",
    entityType: "credit_card",
    entityId: id,
    before: null,
    after: JSON.stringify(card),
  });
  res.status(201).json({ ...card, availablePaise: card.totalLimitPaise - card.usedPaise });
}

export async function getCard(req: Request, res: Response) {
  const repo = getRepo();
  const card = await repo.cards.get(String((req.params as Record<string,string>).id));
  if (!card) return res.status(404).json({ error: "not found" });
  res.json({ ...card, availablePaise: card.totalLimitPaise - card.usedPaise });
}

export async function updateCard(req: Request, res: Response) {
  const repo = getRepo();
  const card = await repo.cards.get(String((req.params as Record<string,string>).id));
  if (!card) return res.status(404).json({ error: "not found" });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.totalLimitPaise !== undefined && card.usedPaise > parsed.data.totalLimitPaise) {
    return res.status(400).json({ error: "used exceeds new limit" });
  }
  const before = { ...card };
  const updated = await repo.cards.update(card.id, {
    ...(parsed.data.issuer !== undefined ? { issuer: parsed.data.issuer } : {}),
    ...(parsed.data.last4 !== undefined ? { last4: parsed.data.last4 } : {}),
    ...(parsed.data.totalLimitPaise !== undefined ? { totalLimitPaise: parsed.data.totalLimitPaise } : {}),
  });
  await repo.audit.write({
    actorId: actor(req),
    action: "card.update",
    entityType: "credit_card",
    entityId: card.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json({ ...updated, availablePaise: updated.totalLimitPaise - updated.usedPaise });
}

export async function deactivateCard(req: Request, res: Response) {
  const repo = getRepo();
  const card = await repo.cards.get(String((req.params as Record<string,string>).id));
  if (!card) return res.status(404).json({ error: "not found" });
  const before = { ...card };
  const updated = await repo.cards.update(card.id, { status: "deactivated" });
  await repo.audit.write({
    actorId: actor(req),
    action: "card.deactivate",
    entityType: "credit_card",
    entityId: card.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json(updated);
}
