import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gte, lte, desc, count } from "@repo/db";
import { db as prodDb } from "@repo/db";
import { auditLogs, customers, fundingSources, transactions } from "@repo/db/schema";
import { resolveAmount } from "@repo/schemas";
import type { createTransactionSchema, transactionFilterQuerySchema } from "@repo/schemas";
import type { z } from "zod";
import { toTransactionDto } from "../lib/dto.js";
import { ApiError } from "../lib/http/errors.js";

type DbClient = typeof prodDb;
type CreateTransactionBody = z.infer<typeof createTransactionSchema>;
type TransactionFilterQuery = z.infer<typeof transactionFilterQuerySchema>;

export function createTransactionsController(db: DbClient = prodDb) {
  const assertCustomerExists = async (tx: DbClient, userId: string, customerId: string) => {
    const rows = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.userId, userId)))
      .limit(1);
    if (!rows[0]) throw new ApiError(404, "customer not found");
  };

  const loadSource = async (tx: DbClient, userId: string, sourceId: string) => {
    const rows = await tx
      .select()
      .from(fundingSources)
      .where(and(eq(fundingSources.id, sourceId), eq(fundingSources.userId, userId)))
      .limit(1);
    if (!rows[0]) throw new ApiError(404, "funding source not found");
    const src = rows[0];
    if (src.status !== "active") throw new ApiError(400, "funding source is deactivated");
    return src;
  };

  const applySourceDelta = async (tx: DbClient, src: typeof fundingSources.$inferSelect, direction: "debit" | "credit", amountPaise: number) => {
    if (src.kind === "bank_account") {
      if (direction === "debit") {
        const balance = src.currentBalancePaise ?? 0;
        if (balance < amountPaise) throw new ApiError(400, "insufficient account balance");
        await tx
          .update(fundingSources)
          .set({ currentBalancePaise: balance - amountPaise, updatedAt: new Date() })
          .where(eq(fundingSources.id, src.id));
      } else {
        await tx
          .update(fundingSources)
          .set({ currentBalancePaise: (src.currentBalancePaise ?? 0) + amountPaise, updatedAt: new Date() })
          .where(eq(fundingSources.id, src.id));
      }
    } else {
      if (direction === "debit") {
        const available = (src.totalLimitPaise ?? 0) - (src.usedPaise ?? 0);
        if (available < amountPaise) throw new ApiError(400, "insufficient card limit");
        await tx
          .update(fundingSources)
          .set({ usedPaise: (src.usedPaise ?? 0) + amountPaise, updatedAt: new Date() })
          .where(eq(fundingSources.id, src.id));
      } else {
        const nextUsed = Math.max(0, (src.usedPaise ?? 0) - amountPaise);
        await tx.update(fundingSources).set({ usedPaise: nextUsed, updatedAt: new Date() }).where(eq(fundingSources.id, src.id));
      }
    }
  };

  const createTransaction = async (req: Request, res: Response) => {
    const body = req.validatedBody as CreateTransactionBody;
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    if (body.direction === "credit") {
      throw new ApiError(400, "repayments must be recorded via the repayments endpoint");
    }

    const amountPaise = resolveAmount(body);
    if (amountPaise === null) {
      throw new ApiError(400, "amountPaise or amountRupees is required and must be >0, not both");
    }

    const occurredAtIso = body.occurredAt ? new Date(body.occurredAt as string).toISOString() : new Date().toISOString();
    const id = randomUUID();

    await assertCustomerExists(db, userId, body.customerId);

    const created = await db.transaction(async (tx) => {
      const tdb = tx as unknown as DbClient;
      const src = await loadSource(tdb, userId, body.sourceId);
      await applySourceDelta(tdb, src, body.direction, amountPaise);
      const [row] = await tdb
        .insert(transactions)
        .values({
          id,
          userId,
          direction: body.direction,
          amountPaise,
          customerId: body.customerId,
          sourceId: body.sourceId,
          occurredAt: new Date(occurredAtIso),
          note: body.note ?? null,
          createdBy: userId,
        })
        .returning();
      if (!row) throw new ApiError(500, "failed to create transaction");
      await tdb.insert(auditLogs).values({
        actorId: userId,
        action: "transaction.create",
        entityType: "transaction",
        entityId: row.id,
        before: null,
        after: row as unknown as never,
      });
      return row;
    });

    return res.status(201).json({ transaction: toTransactionDto(created as typeof transactions.$inferSelect) });
  };

  const listTransactions = async (req: Request, res: Response) => {
    const q = req.validatedQuery as TransactionFilterQuery;
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, userId)];
    if (q.customerId) conditions.push(eq(transactions.customerId, q.customerId));
    if (q.direction) conditions.push(eq(transactions.direction, q.direction as never));
    if (q.from) conditions.push(gte(transactions.occurredAt, new Date(q.from)));
    if (q.to) conditions.push(lte(transactions.occurredAt, new Date(q.to)));

    const where = conditions.length === 1 ? conditions[0]! : and(...conditions);

    const totalRows = await db.select({ value: count() }).from(transactions).where(where);
    const total = totalRows[0]?.value ?? 0;

    const offset = (q.page - 1) * q.limit;
    const rows = await db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.occurredAt))
      .limit(q.limit)
      .offset(offset);

    return res.json({ transactions: rows.map(toTransactionDto), total, page: q.page, limit: q.limit });
  };

  return { createTransaction, listTransactions };
}
