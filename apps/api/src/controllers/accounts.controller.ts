import type { Request, Response, RequestHandler } from "express";
import { eq, asc } from "@repo/db";
import { db } from "@repo/db";
import type { createAccountSchema, updateAccountSchema } from "@repo/schemas";
import type { z } from "zod";
import type { BodyRequest } from "@repo/schemas";
import { accounts, auditLogs } from "@repo/db/schema";
import { toAccountDto } from "../lib/dto.js";
import { getActor } from "../lib/actor.js";

type CreateAccountBody = z.infer<typeof createAccountSchema>;
type UpdateAccountBody = z.infer<typeof updateAccountSchema>;

export const listAccounts: RequestHandler = async (_req, res) => {
  const rows = await db.select().from(accounts).orderBy(asc(accounts.createdAt));
  return res.json({ accounts: rows.map(toAccountDto) });
};

export const getAccount: RequestHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "account not found" });
  return res.json({ account: toAccountDto(rows[0]!) });
};

export const createAccount: RequestHandler = async (req, res) => {
  const body = (req as BodyRequest<CreateAccountBody>).validatedBody;
  const actorId = getActor(req as Request);
  try {
    const [row] = await db
      .insert(accounts)
      .values({
        name: body.name,
        type: body.type,
        openingBalancePaise: body.openingBalancePaise,
        currentBalancePaise: body.openingBalancePaise,
      })
      .returning();
    if (!row) return res.status(500).json({ error: "failed to create account" });
    await db.insert(auditLogs).values({
      actorId,
      action: "account.create",
      entityType: "account",
      entityId: row.id,
      before: null,
      after: row as unknown as never,
    });
    return res.status(201).json({ account: toAccountDto(row) });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const updateAccount: RequestHandler = async (req, res) => {
  const { id } = req.params as { id: string };
  const body = (req as BodyRequest<UpdateAccountBody>).validatedBody;
  const actorId = getActor(req as Request);

  const existing = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!existing[0]) return res.status(404).json({ error: "account not found" });
  const before = existing[0]!;

  const [row] = await db
    .update(accounts)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "account not found" });

  await db.insert(auditLogs).values({
    actorId,
    action: "account.update",
    entityType: "account",
    entityId: row.id,
    before: before as unknown as never,
    after: row as unknown as never,
  });

  return res.json({ account: toAccountDto(row) });
};
