import type { Request, Response, RequestHandler } from "express";
import { db } from "@repo/db";
import type { createTransactionSchema, transactionFilterQuerySchema } from "@repo/schemas";
import type { z } from "zod";
import type { BodyRequest, QueryRequest } from "@repo/schemas";
import { toTransactionDto } from "../lib/dto.js";
import { getActor } from "../lib/actor.js";
import { createLedgerTransaction, LedgerError } from "../services/ledger.service.js";
import { listTransactionsQuery } from "../services/queries.service.js";

type CreateTransactionBody = z.infer<typeof createTransactionSchema>;
type TransactionFilterQuery = z.infer<typeof transactionFilterQuerySchema>;

export const createTransaction = async (req: Request, res: Response) => {
  const body = (req as unknown as BodyRequest<CreateTransactionBody>).validatedBody;
  const actorId = getActor(req);
  try {
    const row = await createLedgerTransaction(body, { db, actorId });
    return res.status(201).json({ transaction: toTransactionDto(row) });
  } catch (e) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const listTransactions = async (req: Request, res: Response) => {
  const q = (req as unknown as QueryRequest<TransactionFilterQuery>).validatedQuery;
  const userId = getActor(req)!;

  const { transactions: rows, total } = await listTransactionsQuery(userId, q, { db });
  return res.json({ transactions: rows.map(toTransactionDto), total, page: q.page, limit: q.limit });
};
