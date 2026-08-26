import type { Request, Response } from "express";
import { eq, desc, and } from "@repo/db";
import { db } from "@repo/db";
import { transactions } from "@repo/db/schema";
import { toTransactionDto } from "../lib/dto.js";
import { createLedgerTransaction, reverseLedgerTransaction, LedgerError } from "../services/ledger.service.js";

function getActor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export const createTransaction = async (req: Request, res: Response) => {
  const body = (req as unknown as {
    validatedBody: {
      direction: "debit" | "credit";
      customerId: string;
      sourceType: "account" | "credit_card";
      sourceId: string;
      amountPaise?: number;
      amountRupees?: string | number;
      occurredAt?: string | Date;
      note?: string | null;
      monthlyChargeId?: string | null;
    };
  }).validatedBody;

  const actorId = getActor(req);
  try {
    const row = await createLedgerTransaction(body, { db, actorId });
    return res.status(201).json({ transaction: toTransactionDto(row) });
  } catch (e) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const reverseTransaction = async (req: Request, res: Response) => {
  const { id: transactionId } = req.params as { id: string };
  const actorId = getActor(req);
  try {
    const row = await reverseLedgerTransaction(transactionId, { db, actorId });
    return res.status(201).json({ transaction: toTransactionDto(row) });
  } catch (e) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const listTransactions = async (req: Request, res: Response) => {
  const q = (req as unknown as {
    validatedQuery: {
      customerId?: string;
      sourceType?: "account" | "credit_card";
      sourceId?: string;
      direction?: "debit" | "credit";
      from?: string;
      to?: string;
      page: number;
      limit: number;
    };
  }).validatedQuery;

  const conditions: ReturnType<typeof eq>[] = [];
  if (q.customerId) conditions.push(eq(transactions.customerId as any, q.customerId as any));
  if (q.sourceType) conditions.push(eq(transactions.sourceType as any, q.sourceType as any));
  if (q.sourceId) conditions.push(eq(transactions.sourceId as any, q.sourceId as any));
  if (q.direction) conditions.push(eq(transactions.direction as any, q.direction as any));

  let rows: (typeof transactions.$inferSelect)[];
  if (conditions.length === 1) rows = await (db as any).select().from(transactions).where(conditions[0]!).orderBy(desc(transactions.occurredAt));
  else if (conditions.length > 1) rows = await (db as any).select().from(transactions).where(and(...conditions)).orderBy(desc(transactions.occurredAt));
  else rows = await (db as any).select().from(transactions).orderBy(desc(transactions.occurredAt));

  if (q.from) {
    const fromD = new Date(q.from);
    rows = rows.filter((r) => new Date(r.occurredAt) >= fromD);
  }
  if (q.to) {
    const toD = new Date(q.to);
    rows = rows.filter((r) => new Date(r.occurredAt) <= toD);
  }

  const total = rows.length;
  const start = (q.page - 1) * q.limit;
  const paged = rows.slice(start, start + q.limit);

  return res.json({ transactions: paged.map(toTransactionDto), total, page: q.page, limit: q.limit });
};
