import { and, eq, sql, inArray } from "@repo/db";
import { db as prodDb } from "@repo/db";
import { customers, fundingSources, transactions, transactionAllocations, auditLogs } from "@repo/db/schema";
import { randomUUID } from "node:crypto";
import { resolveAmount } from "@repo/schemas";
import type { CreateRepaymentInput } from "@repo/schemas";
import { LedgerError } from "./ledger.service.js";

type DbClient = typeof prodDb;
export type SourceOutstanding = {
  sourceId: string;
  name: string;
  kind: "bank_account" | "credit_card";
  outstandingPaise: number;
};

/**
 * Per-source outstanding for a customer, per spec:
 *   sourceOutstanding = debits(source) - allocations(source)
 * Includes sources with zero outstanding so the drawer can show them.
 */
export async function getSourceOutstanding(
  userId: string,
  customerId: string,
  opts: { db?: DbClient } = {},
): Promise<{ customerId: string; total: number; sources: SourceOutstanding[] }> {
  const db = opts.db ?? prodDb;

  const cust = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.userId, userId)))
    .limit(1);
  if (!cust[0]) throw new LedgerError("customer not found", 404);

  // debits grouped by source
  const debitRows = await db
    .select({
      sourceId: transactions.sourceId,
      total: sql<number>`COALESCE(SUM(${transactions.amountPaise}), 0)`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.customerId, customerId),
        eq(transactions.direction, "debit"),
      ),
    )
    .groupBy(transactions.sourceId);

  // repayment allocations grouped by source
  const allocRows = await db
    .select({
      sourceId: transactionAllocations.sourceId,
      total: sql<number>`COALESCE(SUM(${transactionAllocations.amountPaise}), 0)`.as("total"),
    })
    .from(transactionAllocations)
    .where(
      and(
        eq(transactionAllocations.userId, userId),
        eq(transactionAllocations.customerId, customerId),
      ),
    )
    .groupBy(transactionAllocations.sourceId);

  const debitMap = new Map(debitRows.map((r) => [r.sourceId!, Number(r.total)]));
  const allocMap = new Map(allocRows.map((r) => [r.sourceId, Number(r.total)]));

  const touchedSourceIds = new Set<string>([
    ...debitMap.keys(),
    ...allocMap.keys(),
  ]);

  // names/kinds for every touched source (plus all user sources for display completeness is not needed here)
  let meta: Array<{ id: string; name: string; kind: string }> = [];
  if (touchedSourceIds.size > 0) {
    meta = await db
      .select({ id: fundingSources.id, name: fundingSources.name, kind: fundingSources.kind })
      .from(fundingSources)
      .where(inArray(fundingSources.id, [...touchedSourceIds]));
  }
  const metaMap = new Map(meta.map((m) => [m.id, m]));

  const sources: SourceOutstanding[] = [];
  let total = 0;
  for (const sourceId of touchedSourceIds) {
    const m = metaMap.get(sourceId);
    const outstanding = (debitMap.get(sourceId) ?? 0) - (allocMap.get(sourceId) ?? 0);
    total += outstanding;
    sources.push({
      sourceId,
      name: m?.name ?? "Unknown source",
      kind: (m?.kind as SourceOutstanding["kind"]) ?? "bank_account",
      outstandingPaise: outstanding,
    });
  }
  // newest activity first for a stable drawer order
  sources.sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  return { customerId, total, sources };
}

/** Oldest-debit-first ordering of the customer's sources that still have outstanding. */
async function fifoOrder(
  db: DbClient,
  userId: string,
  customerId: string,
): Promise<Array<{ sourceId: string; outstanding: number }>> {
  const rows = await db
    .select({
      sourceId: transactions.sourceId,
      amountPaise: transactions.amountPaise,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.customerId, customerId),
        eq(transactions.direction, "debit"),
      ),
    );

  const allocRows = await db
    .select({
      sourceId: transactionAllocations.sourceId,
      amountPaise: transactionAllocations.amountPaise,
    })
    .from(transactionAllocations)
    .where(
      and(eq(transactionAllocations.userId, userId), eq(transactionAllocations.customerId, customerId)),
    );

  const totals = new Map<string, { outstanding: number; oldest: Date }>();
  for (const r of rows) {
    const cur = totals.get(r.sourceId!) ?? { outstanding: 0, oldest: r.occurredAt };
    cur.outstanding += r.amountPaise;
    if (r.occurredAt < cur.oldest) cur.oldest = r.occurredAt;
    totals.set(r.sourceId!, cur);
  }
  for (const r of allocRows) {
    const cur = totals.get(r.sourceId);
    if (cur) cur.outstanding -= r.amountPaise;
  }

  return [...totals.entries()]
    .filter(([, v]) => v.outstanding > 0)
    .sort((a, b) => a[1].oldest.getTime() - b[1].oldest.getTime())
    .map(([sourceId, v]) => ({ sourceId, outstanding: v.outstanding }));
}

export async function createRepayment(
  userId: string,
  input: CreateRepaymentInput,
  opts: { db?: DbClient } = {},
): Promise<{ transaction: typeof transactions.$inferSelect; allocations: Array<typeof transactionAllocations.$inferSelect> }> {
  const db = opts.db ?? prodDb;

  // manual mode may omit the explicit amount — it is the allocation sum
  const input2 =
    input.mode === "manual" && input.amountPaise === undefined && input.amountRupees === undefined
      ? { ...input, amountPaise: (input.allocations ?? []).reduce((s, a) => s + a.amountPaise, 0) }
      : input;

  const amountPaise = resolveAmount(input2);
  if (amountPaise === null) {
    throw new LedgerError("amountPaise or amountRupees is required and must be >0, not both", 400);
  }

  const cust = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.userId, userId)))
    .limit(1);
  if (!cust[0]) throw new LedgerError("customer not found", 404);

  // ---- build allocations ----
  let pairs: Array<{ sourceId: string; amountPaise: number }>;

  if (input.mode === "fifo") {
    const queue = await fifoOrder(db, userId, input.customerId);
    const availableTotal = queue.reduce((s, q) => s + q.outstanding, 0);
    if (availableTotal < amountPaise) {
      throw new LedgerError("repayment exceeds total outstanding", 400);
    }
    pairs = [];
    let left = amountPaise;
    for (const q of queue) {
      if (left <= 0) break;
      const give = Math.min(q.outstanding, left);
      pairs.push({ sourceId: q.sourceId, amountPaise: give });
      left -= give;
    }
  } else {
    const manual = input.allocations ?? [];
    const sum = manual.reduce((s, a) => s + a.amountPaise, 0);
    if (sum !== amountPaise) {
      throw new LedgerError(`allocation total ${sum} must equal repayment amount ${amountPaise}`, 400);
    }
    const seen = new Set<string>();
    for (const a of manual) {
      if (seen.has(a.sourceId)) throw new LedgerError("duplicate allocation for source", 400);
      seen.add(a.sourceId);
    }
    const breakdown = await getSourceOutstanding(userId, input.customerId, { db });
    const map = new Map(breakdown.sources.map((s) => [s.sourceId, s.outstandingPaise]));
    for (const a of manual) {
      const outstanding = map.get(a.sourceId);
      if (outstanding === undefined) throw new LedgerError("source does not belong to this customer's ledger", 400);
      if (a.amountPaise > outstanding) {
        throw new LedgerError("allocation exceeds source outstanding", 400);
      }
    }
    pairs = manual;
  }

  // ---- persist atomically ----
  const txnId = randomUUID();
  const occurredAtIso = input.occurredAt ? new Date(input.occurredAt as string).toISOString() : new Date().toISOString();

  const created = await db.transaction(async (tx) => {
    const tdb = tx as unknown as DbClient;

    // lock-check each allocated source: belongs to user, active, cache stays valid
    for (const p of pairs) {
      const srcRows = await tdb
        .select()
        .from(fundingSources)
        .where(and(eq(fundingSources.id, p.sourceId), eq(fundingSources.userId, userId)))
        .limit(1);
      const src = srcRows[0];
      if (!src) throw new LedgerError("funding source not found", 404);
      if (src.status !== "active") throw new LedgerError("funding source is deactivated", 400);

      if (src.kind === "credit_card") {
        const nextUsed = (src.usedPaise ?? 0) - p.amountPaise;
        if (nextUsed < 0) {
          throw new LedgerError("allocation would overpay a credit card", 400);
        }
        await tdb
          .update(fundingSources)
          .set({ usedPaise: nextUsed, updatedAt: new Date() })
          .where(eq(fundingSources.id, src.id));
      } else {
        await tdb
          .update(fundingSources)
          .set({ currentBalancePaise: (src.currentBalancePaise ?? 0) + p.amountPaise, updatedAt: new Date() })
          .where(eq(fundingSources.id, src.id));
      }
    }

    const [txn] = await tdb
      .insert(transactions)
      .values({
        id: txnId,
        userId,
        direction: "credit",
        amountPaise,
        customerId: input.customerId,
        sourceId: null,
        occurredAt: new Date(occurredAtIso),
        note: input.note ?? null,
        createdBy: userId,
      })
      .returning();
    if (!txn) throw new LedgerError("failed to create repayment", 500);

    const allocRows = await tdb
      .insert(transactionAllocations)
      .values(pairs.map((p) => ({
        userId,
        transactionId: txn.id,
        customerId: input.customerId,
        sourceId: p.sourceId,
        amountPaise: p.amountPaise,
      })))
      .returning();

    await tdb.insert(auditLogs).values({
      actorId: userId,
      action: "repayment.create",
      entityType: "transaction",
      entityId: txn.id,
      before: null,
      after: { ...txn, allocations: allocRows } as unknown as never,
    });

    return { transaction: txn, allocations: allocRows };
  });

  return created;
}
