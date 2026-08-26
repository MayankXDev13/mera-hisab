import type { Request, Response } from "express";
import { and, eq } from "@repo/db";
import { db } from "@repo/db";
import { fundingSources, auditLogs } from "@repo/db/schema";
import type { createCardSchema, updateCardSchema } from "@repo/schemas";
import type { z } from "zod";
import type { BodyRequest } from "@repo/schemas";
import { toCardDto } from "../lib/dto.js";
import { getActor } from "../lib/actor.js";
import { listFundingSourcesQuery } from "../services/queries.service.js";

type CreateCardBody = z.infer<typeof createCardSchema>;
type UpdateCardBody = z.infer<typeof updateCardSchema>;

const KIND = "credit_card" as const;

export const listCards = async (req: Request, res: Response) => {
  const userId = getActor(req);
  const rows = await listFundingSourcesQuery(userId!, KIND);
  return res.json({ cards: rows.map(toCardDto) });
};

export const getCard = async (req: Request, res: Response) => {
  const userId = getActor(req);
  const { id } = req.params as { id: string };
  const rows = await db
    .select()
    .from(fundingSources)
    .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId!), eq(fundingSources.kind, KIND)))
    .limit(1);
  if (!rows[0]) return res.status(404).json({ error: "card not found" });
  return res.json({ card: toCardDto(rows[0]) });
};

export const createCard = async (req: Request, res: Response) => {
  const userId = getActor(req)!;
  const body = (req as unknown as BodyRequest<CreateCardBody>).validatedBody;
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
  if (!row) return res.status(500).json({ error: "failed to create card" });
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

export const updateCard = async (req: Request, res: Response) => {
  const userId = getActor(req)!;
  const { id } = req.params as { id: string };
  const body = (req as unknown as BodyRequest<UpdateCardBody>).validatedBody;

  const beforeRows = await db
    .select()
    .from(fundingSources)
    .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
    .limit(1);
  if (!beforeRows[0]) return res.status(404).json({ error: "card not found" });

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
  if (!row) return res.status(404).json({ error: "card not found" });

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
