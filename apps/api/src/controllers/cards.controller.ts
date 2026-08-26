import type { Request, Response } from "express";
import { eq, asc } from "@repo/db";
import { db as _db } from "@repo/db";
const db: any = _db;
import { creditCards, auditLogs } from "@repo/db/schema";
import { toCardDto } from "../lib/dto.js";

function getActor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export const listCards = async (_req: Request, res: Response) => {
  const rows = await (db as any).select().from(creditCards).orderBy(asc(creditCards.createdAt));
  return res.json({ cards: rows.map(toCardDto) });
};

export const getCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = await (db as any).select().from(creditCards).where(eq(creditCards.id as any, id! as any)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "card not found" });
  return res.json({ card: toCardDto(rows[0]!) });
};

export const createCard = async (req: Request, res: Response) => {
  const body = (req as unknown as { validatedBody: { issuer: string; last4: string; totalLimitPaise: number } }).validatedBody;
  const actorId = getActor(req);
  try {
    const [row] = await db
      .insert(creditCards)
      .values({
        issuer: body.issuer,
        last4: body.last4,
        totalLimitPaise: body.totalLimitPaise,
        usedPaise: 0,
      })
      .returning();
    if (!row) return res.status(500).json({ error: "failed to create card" });
    await (db as any).insert(auditLogs).values({
      actorId,
      action: "card.create",
      entityType: "credit_card",
      entityId: row.id,
      before: null,
      after: row as unknown as never,
    });
    return res.status(201).json({ card: toCardDto(row) });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const updateCard = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = (req as unknown as { validatedBody: { issuer?: string; last4?: string; totalLimitPaise?: number; status?: "active" | "deactivated" } }).validatedBody;
  const actorId = getActor(req);

  const existing = await (db as any).select().from(creditCards).where(eq(creditCards.id as any, id! as any)).limit(1);
  if (!existing[0]) return res.status(404).json({ error: "card not found" });
  const before = existing[0]!;

  const [row] = await db
    .update(creditCards)
    .set({
      ...(body.issuer !== undefined ? { issuer: body.issuer } : {}),
      ...(body.last4 !== undefined ? { last4: body.last4 } : {}),
      ...(body.totalLimitPaise !== undefined ? { totalLimitPaise: body.totalLimitPaise } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(creditCards.id as any, id! as any))
    .returning();
  if (!row) return res.status(404).json({ error: "card not found" });

  await (db as any).insert(auditLogs).values({
    actorId,
    action: "card.update",
    entityType: "credit_card",
    entityId: row.id,
    before: before as unknown as never,
    after: row as unknown as never,
  });

  return res.json({ card: toCardDto(row) });
};
