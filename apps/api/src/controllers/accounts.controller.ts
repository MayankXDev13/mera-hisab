import type { Request, Response } from "express";
import { and, eq, desc } from "@repo/db";
import { db as prodDb } from "@repo/db";
import { fundingSources, auditLogs } from "@repo/db/schema";
import type { createBankAccountSchema, updateBankAccountSchema } from "@repo/schemas";
import type { z } from "zod";
import { toAccountDto } from "../lib/dto.js";
import { ApiError } from "../lib/http/errors.js";

type DbClient = typeof prodDb;
type CreateAccountBody = z.infer<typeof createBankAccountSchema>;
type UpdateAccountBody = z.infer<typeof updateBankAccountSchema>;

const KIND = "bank_account" as const;

export function createAccountsController(db: DbClient = prodDb) {
  const listAccounts = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const rows = await db
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
      .orderBy(desc(fundingSources.createdAt));
    return res.json({ accounts: rows.map(toAccountDto) });
  };

  const getAccount = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const { id } = req.params as { id: string };
    const rows = await db
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
      .limit(1);
    if (!rows[0]) throw new ApiError(404, "account not found");
    return res.json({ account: toAccountDto(rows[0]) });
  };

  const createAccount = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const body = req.validatedBody as CreateAccountBody;
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
    if (!row) throw new ApiError(500, "failed to create account");
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

  const updateAccount = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const { id } = req.params as { id: string };
    const body = req.validatedBody as UpdateAccountBody;

    const beforeRows = await db
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId), eq(fundingSources.kind, KIND)))
      .limit(1);
    if (!beforeRows[0]) throw new ApiError(404, "account not found");

    const [row] = await db
      .update(fundingSources)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(fundingSources.id, id), eq(fundingSources.userId, userId)))
      .returning();
    if (!row) throw new ApiError(404, "account not found");

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

  return { listAccounts, getAccount, createAccount, updateAccount };
}
