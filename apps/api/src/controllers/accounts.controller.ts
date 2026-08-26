import type { Request, Response } from "express";
import { eq, asc } from "@repo/db";
import { db as _db } from "@repo/db";
const db: any = _db;
import { accounts, auditLogs } from "@repo/db/schema";
import { toAccountDto } from "../lib/dto.js";

function getActor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export const listAccounts = async (_req: Request, res: Response) => {
  const rows = await (db as any).select().from(accounts).orderBy(asc(accounts.createdAt));
  return res.json({ accounts: rows.map(toAccountDto) });
};

export const getAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = await (db as any).select().from(accounts).where(eq(accounts.id as any, id! as any)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "account not found" });
  return res.json({ account: toAccountDto(rows[0]!) });
};

export const createAccount = async (req: Request, res: Response) => {
  const body = (
    req as unknown as {
      validatedBody: {
        name: string;
        type: "savings" | "current";
        openingBalancePaise: number;
      };
    }
  ).validatedBody;
  const actorId = getActor(req);
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
    await (db as any).insert(auditLogs).values({
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

export const updateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = (
    req as unknown as {
      validatedBody: {
        name?: string;
        type?: "savings" | "current";
        status?: "active" | "deactivated";
      };
    }
  ).validatedBody;
  const actorId = getActor(req);

  const existing = await (db as any).select().from(accounts).where(eq(accounts.id as any, id! as any)).limit(1);
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
    .where(eq(accounts.id as any, id! as any))
    .returning();
  if (!row) return res.status(404).json({ error: "account not found" });

  await (db as any).insert(auditLogs).values({
    actorId,
    action: "account.update",
    entityType: "account",
    entityId: row.id,
    before: before as unknown as never,
    after: row as unknown as never,
  });

  return res.json({ account: toAccountDto(row) });
};
