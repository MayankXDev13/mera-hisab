import type { Request, Response } from "express";
import { and, eq, desc } from "@repo/db";
import { db as prodDb } from "@repo/db";
import { fundingSources, auditLogs } from "@repo/db/schema";
import type { createCardSchema, updateCardSchema } from "@repo/schemas";
import type { z } from "zod";
import { toCardDto } from "../lib/dto.js";
import { ApiError } from "../lib/http/errors.js";

type DbClient = typeof prodDb;
type CreateCardBody = z.infer<typeof createCardSchema>;
type UpdateCardBody = z.infer<typeof updateCardSchema>;

const KIND = "credit_card" as const;

export function createCardsController(db: DbClient = prodDb) {
  const listCards = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const rows = await db
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
      .orderBy(desc(fundingSources.createdAt));
    return res.json({ cards: rows.map(toCardDto) });
  };

  const getCard = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const { id } = req.params as { id: string };
    const rows = await db
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
      .limit(1);
    if (!rows[0]) throw new ApiError(404, "card not found");
    return res.json({ card: toCardDto(rows[0]) });
  };

  const createCard = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const body = req.validatedBody as CreateCardBody;
    const [row] = await db
      .insert(fundingSources)
      .values({
        userId,
        kind: KIND,
        name: body.issuer,
        issuer: body.issuer,
        last4: body.last4,
        totalLimitPaise: body.totalLimitPaise,
        usedPaise: 0,
      })
      .returning();
    if (!row) throw new ApiError(500, "failed to create card");
    await db.insert(auditLogs).values({
      actorId: userId,
      action: "card.create",
      entityType: "funding_source",
      entityId: row.id,
      before: null,
      after: row as unknown as never,
    });
    return res.status(201).json({ card: toCardDto(row) });
  };

  const updateCard = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const { id } = req.params as { id: string };
    const body = req.validatedBody as UpdateCardBody;

    const beforeRows = await db
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
      .limit(1);
    if (!beforeRows[0]) throw new ApiError(404, "card not found");

    const [row] = await db
      .update(fundingSources)
      .set({
        ...(body.issuer !== undefined ? { issuer: body.issuer, name: body.issuer } : {}),
        ...(body.last4 !== undefined ? { last4: body.last4 } : {}),
        ...(body.totalLimitPaise !== undefined ? { totalLimitPaise: body.totalLimitPaise } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId)))
      .returning();
    if (!row) throw new ApiError(404, "card not found");

    await db.insert(auditLogs).values({
      actorId: userId,
      action: "card.update",
      entityType: "funding_source",
      entityId: row.id,
      before: beforeRows[0] as unknown as never,
      after: row as unknown as never,
    });

    return res.json({ card: toCardDto(row) });
  };

  return { listCards, getCard, createCard, updateCard };
}
