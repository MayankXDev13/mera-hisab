import { eq, gte, lte, and, desc, count, sql, inArray } from "@repo/db";
import { db as prodDb } from "@repo/db";
import { customers, fundingSources, transactions } from "@repo/db/schema";
import { LedgerError } from "./ledger.service.js";

type DbClient = typeof prodDb;

export type ListTransactionsQuery = {
  customerId?: string;
  direction?: "debit" | "credit";
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export async function listTransactionsQuery(
  userId: string,
  q: ListTransactionsQuery,
  opts: { db?: DbClient } = {}
): Promise<{ transactions: typeof transactions.$inferSelect[]; total: number }> {
  const db = opts.db ?? prodDb;

  const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, userId)];
  if (q.customerId) conditions.push(eq(transactions.customerId, q.customerId));
  if (q.direction) conditions.push(eq(transactions.direction, q.direction as any));
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

  return { transactions: rows, total };
}

export async function getOutstandingQuery(
  userId: string,
  customerId: string,
  opts: { db?: DbClient } = {}
): Promise<number> {
  const db = opts.db ?? prodDb;

  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new LedgerError("customer not found", 404);

  const res = await db
    .select({
      outstandingPaise: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.direction} = 'debit' THEN ${transactions.amountPaise} ELSE -${transactions.amountPaise} END), 0)`.as("outstandingPaise"),
    })
    .from(transactions)
    .where(and(eq(transactions.customerId, customerId), eq(transactions.userId, userId)));

  return res[0]?.outstandingPaise ?? 0;
}

export async function getOutstandingBatchQuery(
  userId: string,
  customerIds: string[],
  opts: { db?: DbClient } = {}
): Promise<Record<string, number>> {
  const db = opts.db ?? prodDb;
  if (customerIds.length === 0) return {};

  const rows = await db
    .select({
      customerId: transactions.customerId,
      outstandingPaise: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.direction} = 'debit' THEN ${transactions.amountPaise} ELSE -${transactions.amountPaise} END), 0)`.as("outstandingPaise"),
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.customerId, customerIds)))
    .groupBy(transactions.customerId);

  const map: Record<string, number> = {};
  for (const id of customerIds) map[id] = 0;
  for (const r of rows) map[r.customerId] = r.outstandingPaise;
  return map;
}

/** List a user's funding sources by kind ('bank_account' | 'credit_card'). */
export async function listFundingSourcesQuery(
  userId: string,
  kind: "bank_account" | "credit_card",
  opts: { db?: DbClient } = {}
): Promise<typeof fundingSources.$inferSelect[]> {
  const db = opts.db ?? prodDb;
  return db
    .select()
    .from(fundingSources)
    .where(and(eq(fundingSources.userId, userId), eq(fundingSources.kind, kind)))
    .orderBy(desc(fundingSources.createdAt));
}
