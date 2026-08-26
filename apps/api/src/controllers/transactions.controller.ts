import type { Request, Response } from "express";
import { db } from "@repo/db";
import { toTransactionDto } from "../lib/dto.js";
import { createLedgerTransaction, reverseLedgerTransaction, LedgerError } from "../services/ledger.service.js";
import { listTransactionsQuery } from "../services/queries.service.js";

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

  const { transactions: rows, total } = await listTransactionsQuery(q, { db });
  return res.json({ transactions: rows.map(toTransactionDto), total, page: q.page, limit: q.limit });
};
