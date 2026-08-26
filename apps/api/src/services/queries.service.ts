import { eq, gte, lte, and, desc, count, sql, inArray } from "@repo/db";
import { db as prodDb } from "@repo/db";
import { customers, transactions } from "@repo/db/schema";
import { LedgerError } from "./ledger.service.js";

type DbClient = typeof prodDb;

export type ListTransactionsQuery = {
  customerId?: string;
  sourceType?: "account" | "credit_card";
  sourceId?: string;
  direction?: "debit" | "credit";
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export async function listTransactionsQuery(
  q: ListTransactionsQuery,
  opts: { db?: DbClient } = {}
): Promise<{ transactions: typeof transactions.$inferSelect[]; total: number }> {
  const db = opts.db ?? prodDb;

  const conditions: ReturnType<typeof eq>[] = [];
  if (q.customerId) conditions.push(eq(transactions.customerId, q.customerId));
  if (q.sourceType) conditions.push(eq(transactions.sourceType, q.sourceType as any));
  if (q.sourceId) conditions.push(eq(transactions.sourceId, q.sourceId));
  if (q.direction) conditions.push(eq(transactions.direction, q.direction as any));
  if (q.from) conditions.push(gte(transactions.occurredAt, new Date(q.from)));
  if (q.to) conditions.push(lte(transactions.occurredAt, new Date(q.to)));

  const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0]! : and(...conditions);

  // count total first (same where, no pagination)
  let total: number;
  if (where) {
    const rows = await db.select({ value: count() }).from(transactions).where(where);
    total = rows[0]?.value ?? 0;
  } else {
    const rows = await db.select({ value: count() }).from(transactions);
    total = rows[0]?.value ?? 0;
  }

  const offset = (q.page - 1) * q.limit;

  let rows: typeof transactions.$inferSelect[];
  if (where) {
    rows = await db.select().from(transactions).where(where).orderBy(desc(transactions.occurredAt)).limit(q.limit).offset(offset);
  } else {
    rows = await db.select().from(transactions).orderBy(desc(transactions.occurredAt)).limit(q.limit).offset(offset);
  }

  return { transactions: rows, total };
}

export async function getOutstandingQuery(
  customerId: string,
  opts: { db?: DbClient } = {}
): Promise<number> {
  const db = opts.db ?? prodDb;

  const rows = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!rows[0]) throw new LedgerError("customer not found", 404);

  const res = await db
    .select({
      outstandingPaise: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.direction} = 'debit' THEN ${transactions.amountPaise} ELSE -${transactions.amountPaise} END), 0)`.as("outstandingPaise"),
    })
    .from(transactions)
    .where(eq(transactions.customerId, customerId));

  return res[0]?.outstandingPaise ?? 0;
}

export async function getOutstandingBatchQuery(
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
    .where(inArray(transactions.customerId, customerIds))
    .groupBy(transactions.customerId);

  const map: Record<string, number> = {};
  for (const id of customerIds) map[id] = 0;
  for (const r of rows) map[r.customerId] = r.outstandingPaise;
  return map;
}
