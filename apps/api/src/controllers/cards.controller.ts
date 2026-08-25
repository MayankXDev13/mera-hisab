import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { toCardDto } from "../lib/dto.js";

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listCards(_req: Request, res: Response) {
  const repo = getRepo();
  const list = await repo.cards.list();
  res.json(list.map(toCardDto));
}

export async function createCard(req: Request, res: Response) {
  const body = req.body as { issuer: string; last4: string; totalLimitPaise: number };
  const repo = getRepo();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const card = await repo.cards.create({
    id,
    issuer: body.issuer,
    last4: body.last4,
    totalLimitPaise: body.totalLimitPaise,
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
  res.status(201).json(toCardDto(card));
}

export async function getCard(req: Request, res: Response) {
  const repo = getRepo();
  const card = await repo.cards.get(String((req.params as Record<string, string>).id));
  if (!card) return res.status(404).json({ error: "not found" });
  res.json(toCardDto(card));
}

export async function updateCard(req: Request, res: Response) {
  const repo = getRepo();
  const card = await repo.cards.get(String((req.params as Record<string, string>).id));
  if (!card) return res.status(404).json({ error: "not found" });
  const body = req.body as { issuer?: string; last4?: string; totalLimitPaise?: number };
  if (body.totalLimitPaise !== undefined && card.usedPaise > body.totalLimitPaise) {
    return res.status(400).json({ error: "used exceeds new limit" });
  }
  const before = { ...card };
  const updated = await repo.cards.update(card.id, {
    ...(body.issuer !== undefined ? { issuer: body.issuer } : {}),
    ...(body.last4 !== undefined ? { last4: body.last4 } : {}),
    ...(body.totalLimitPaise !== undefined ? { totalLimitPaise: body.totalLimitPaise } : {}),
  });
  await repo.audit.write({
    actorId: actor(req),
    action: "card.update",
    entityType: "credit_card",
    entityId: card.id,
    before: JSON.stringify(before),
    after: JSON.stringify(updated),
  });
  res.json(toCardDto(updated));
}

export async function deactivateCard(req: Request, res: Response) {
  const repo = getRepo();
  const card = await repo.cards.get(String((req.params as Record<string, string>).id));
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
  res.json(toCardDto(updated));
}
