import type { Request, Response, RequestHandler } from "express";
import { eq, asc } from "@repo/db";
import { db } from "@repo/db";
import type { createCardSchema, updateCardSchema } from "@repo/schemas";
import type { z } from "zod";
import type { BodyRequest } from "@repo/schemas";
import { creditCards, auditLogs } from "@repo/db/schema";
import { toCardDto } from "../lib/dto.js";
import { getActor } from "../lib/actor.js";

type CreateCardBody = z.infer<typeof createCardSchema>;
type UpdateCardBody = z.infer<typeof updateCardSchema>;

export const listCards: RequestHandler = async (_req, res) => {
  const rows = await db.select().from(creditCards).orderBy(asc(creditCards.createdAt));
  return res.json({ cards: rows.map(toCardDto) });
};

export const getCard: RequestHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const rows = await db.select().from(creditCards).where(eq(creditCards.id, id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "card not found" });
  return res.json({ card: toCardDto(rows[0]!) });
};

export const createCard: RequestHandler = async (req, res) => {
  const body = (req as BodyRequest<CreateCardBody>).validatedBody;
  const actorId = getActor(req as Request);
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
    await db.insert(auditLogs).values({
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

export const updateCard: RequestHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const body = (req as BodyRequest<UpdateCardBody>).validatedBody;
  const actorId = getActor(req as Request);

  const existing = await db.select().from(creditCards).where(eq(creditCards.id, id)).limit(1);
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
    .where(eq(creditCards.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "card not found" });

  await db.insert(auditLogs).values({
    actorId,
    action: "card.update",
    entityType: "credit_card",
    entityId: row.id,
    before: before as unknown as never,
    after: row as unknown as never,
  });

  return res.json({ card: toCardDto(row) });
};
