import type { Request, Response, RequestHandler } from "express";
import { and, eq } from "@repo/db";
import { db } from "@repo/db";
import { fundingSources, auditLogs } from "@repo/db/schema";
import type { createBankAccountSchema, updateBankAccountSchema } from "@repo/schemas";
import type { z } from "zod";
import type { BodyRequest } from "@repo/schemas";
import { toAccountDto, toCardDto } from "../lib/dto.js";
import { getActor } from "../lib/actor.js";
import { listFundingSourcesQuery } from "../services/queries.service.js";

type CreateAccountBody = z.infer<typeof createBankAccountSchema>;
type UpdateAccountBody = z.infer<typeof updateBankAccountSchema>;

const KIND = "bank_account" as const;

export const listAccounts: RequestHandler = async (req, res) => {
  const userId = getActor(req);
  const rows = await listFundingSourcesQuery(userId!, KIND);
  return res.json({ accounts: rows.map(toAccountDto) });
};

export const getAccount: RequestHandler = async (req, res) => {
  const userId = getActor(req);
  const { id } = req.params as { id: string };
  const rows = await db
    .select()
    .from(fundingSources)
    .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId!), eq(fundingSources.kind, KIND)))
    .limit(1);
  if (!rows[0]) return res.status(404).json({ error: "account not found" });
  return res.json({ account: toAccountDto(rows[0]) });
};

export const createAccount = async (req: Request, res: Response) => {
  const userId = getActor(req)!;
  const body = (req as unknown as BodyRequest<CreateAccountBody>).validatedBody;
  const [row] = await db
    .insert(fundingSources)
    .values({
      userId,
      kind: KIND,
      name: body.name,
      openingBalancePaise: body.openingBalancePaise,
      currentBalancePaise: body.openingBalancePaise,
    })
    .returning();
  if (!row) return res.status(500).json({ error: "failed to create account" });
  await db.insert(auditLogs).values({
    actorId: userId,
    action: "account.create",
    entityType: "funding_source",
    entityId: row.id,
    before: null,
    after: row as unknown as never,
  });
  return res.status(201).json({ account: toAccountDto(row) });
};

export const updateAccount = async (req: Request, res: Response) => {
  const userId = getActor(req)!;
  const { id } = req.params as { id: string };
  const body = (req as unknown as BodyRequest<UpdateAccountBody>).validatedBody;

  const beforeRows = await db
    .select()
    .from(fundingSources)
    .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
    .limit(1);
  if (!beforeRows[0]) return res.status(404).json({ error: "account not found" });

  const [row] = await db
    .update(fundingSources)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId)))
    .returning();
  if (!row) return res.status(404).json({ error: "account not found" });

  await db.insert(auditLogs).values({
    actorId: userId,
    action: "account.update",
    entityType: "funding_source",
    entityId: row.id,
    before: beforeRows[0] as unknown as never,
    after: row as unknown as never,
  });

  return res.json({ account: toAccountDto(row) });
};
