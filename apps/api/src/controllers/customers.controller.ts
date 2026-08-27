import type { Request, Response } from "express";
import { and, asc, eq, sql, inArray } from "@repo/db";
import { db } from "@repo/db";
import {
  customers,
  fundingSources,
  transactions,
  transactionAllocations,
  auditLogs,
} from "@repo/db/schema";
import type {
  createCustomerSchema,
  updateCustomerSchema,
  createRepaymentSchema,
} from "@repo/schemas";
import type { z } from "zod";
import { resolveAmount } from "@repo/schemas";
import { toCustomerDto, toTransactionDto } from "../lib/dto.js";
import { ApiError } from "../lib/http/errors.js";

type CreateCustomerBody = z.infer<typeof createCustomerSchema>;
type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>;
type CreateRepaymentBody = z.infer<typeof createRepaymentSchema>;

type SourceOutstanding = {
  sourceId: string;
  name: string;
  kind: "bank_account" | "credit_card";
  outstandingPaise: number;
};

const getSourceOutstanding = async (
  userId: string,
  customerId: string,
): Promise<{
  customerId: string;
  total: number;
  sources: SourceOutstanding[];
}> => {


  const cust = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.userId, userId)))
    .limit(1);


  if (!cust[0]) throw new ApiError(404, "customer not found");

  const debitRows = await db
    .select({
      sourceId: transactions.sourceId,
      total: sql<number>`COALESCE(SUM(${transactions.amountPaise}), 0)`.as(
        "total",
      ),
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

  const allocRows = await db
    .select({
      sourceId: transactionAllocations.sourceId,
      total:
        sql<number>`COALESCE(SUM(${transactionAllocations.amountPaise}), 0)`.as(
          "total",
        ),
    })
    .from(transactionAllocations)
    .where(
      and(
        eq(transactionAllocations.userId, userId),
        eq(transactionAllocations.customerId, customerId),
      ),
    )
    .groupBy(transactionAllocations.sourceId);

  const debitMap = new Map(
    debitRows.map((r) => [r.sourceId!, Number(r.total)]),
  );
  const allocMap = new Map(allocRows.map((r) => [r.sourceId, Number(r.total)]));

  const touchedSourceIds = new Set<string>([
    ...debitMap.keys(),
    ...allocMap.keys(),
  ]);

  let meta: Array<{ id: string; name: string; kind: string }> = [];
  if (touchedSourceIds.size > 0) {
    meta = await db
      .select({
        id: fundingSources.id,
        name: fundingSources.name,
        kind: fundingSources.kind,
      })
      .from(fundingSources)
      .where(inArray(fundingSources.id, [...touchedSourceIds]));
  }
  const metaMap = new Map(meta.map((m) => [m.id, m]));

  const sources: SourceOutstanding[] = [];
  let total = 0;
  for (const sourceId of touchedSourceIds) {
    const m = metaMap.get(sourceId);
    const outstanding =
      (debitMap.get(sourceId) ?? 0) - (allocMap.get(sourceId) ?? 0);
    total += outstanding;
    sources.push({
      sourceId,
      name: m?.name ?? "Unknown source",
      kind: (m?.kind as SourceOutstanding["kind"]) ?? "bank_account",
      outstandingPaise: outstanding,
    });
  }
  sources.sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  return { customerId, total, sources };
};

const fifoOrder = async (
  tx: DbClient,
  userId: string,
  customerId: string,
): Promise<Array<{ sourceId: string; outstanding: number }>> => {
  const rows = await tx
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

  const allocRows = await tx
    .select({
      sourceId: transactionAllocations.sourceId,
      amountPaise: transactionAllocations.amountPaise,
    })
    .from(transactionAllocations)
    .where(
      and(
        eq(transactionAllocations.userId, userId),
        eq(transactionAllocations.customerId, customerId),
      ),
    );

  const totals = new Map<string, { outstanding: number; oldest: Date }>();
  for (const r of rows) {
    const cur = totals.get(r.sourceId!) ?? {
      outstanding: 0,
      oldest: r.occurredAt,
    };
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
};

const fetchOutstandingBatch = async (
  tx: DbClient,
  userId: string,
  customerIds: string[],
): Promise<Record<string, number>> => {
  if (customerIds.length === 0) return {};
  const rows = await tx
    .select({
      customerId: transactions.customerId,
      outstandingPaise:
        sql<number>`COALESCE(SUM(CASE WHEN ${transactions.direction} = 'debit' THEN ${transactions.amountPaise} ELSE -${transactions.amountPaise} END), 0)`.as(
          "outstandingPaise",
        ),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.customerId, customerIds),
      ),
    )
    .groupBy(transactions.customerId);

  const map: Record<string, number> = {};
  for (const id of customerIds) map[id] = 0;
  for (const r of rows) map[r.customerId] = r.outstandingPaise;
  return map;
};

const listCustomers = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .orderBy(asc(customers.createdAt));
  return res.json({ customers: rows.map(toCustomerDto) });
};

const getCustomer = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { id } = req.params as { id: string };
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new ApiError(404, "customer not found");
  return res.json({ customer: toCustomerDto(rows[0]) });
};

const createCustomer = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const body = req.validatedBody as CreateCustomerBody;
  try {
    const [row] = await db
      .insert(customers)
      .values({
        userId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        monthlyRateBps: body.monthlyRateBps,
      })
      .returning();
    if (!row) throw new ApiError(500, "failed to create customer");
    await db.insert(auditLogs).values({
      actorId: userId,
      action: "customer.create",
      entityType: "customer",
      entityId: row.id,
      before: null,
      after: row as unknown as never,
    });
    return res.status(201).json({ customer: toCustomerDto(row) });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (
      msg.includes("customers_username_unique") ||
      msg.includes("duplicate key") ||
      msg.includes("unique")
    ) {
      throw new ApiError(409, "username already exists");
    }
    throw e;
  }
};

const updateCustomer = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { id } = req.params as { id: string };
  const body = req.validatedBody as UpdateCustomerBody;

  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
    .limit(1);
  if (!existing[0]) throw new ApiError(404, "customer not found");
  const before = existing[0];

  try {
    const [row] = await db
      .update(customers)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.monthlyRateBps !== undefined
          ? { monthlyRateBps: body.monthlyRateBps }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    if (!row) throw new ApiError(404, "customer not found");

    await db.insert(auditLogs).values({
      actorId: userId,
      action: "customer.update",
      entityType: "customer",
      entityId: row.id,
      before: before as unknown as never,
      after: row as unknown as never,
    });

    return res.json({ customer: toCustomerDto(row) });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (
      msg.includes("customers_username_unique") ||
      msg.includes("duplicate key")
    ) {
      throw new ApiError(409, "username already exists");
    }
    throw e;
  }
};

const getOutstanding = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { id } = req.params as { id: string };
  const breakdown = await getSourceOutstanding(db, userId, id);
  return res.json({
    customerId: id,
    outstandingPaise: breakdown.total,
    sources: breakdown.sources,
  });
};

const getOutstandingBatch = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const { ids } = req.query as { ids?: string | string[] };
  const list = Array.isArray(ids) ? ids : ids ? ids.split(",") : [];
  if (list.length === 0) return res.json({ outstandings: {} });
  const outstandings = await fetchOutstandingBatch(db, userId, list);
  return res.json({ outstandings });
};

const createRepayment = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) throw new ApiError(401, "Unauthorized");
  const body = req.validatedBody as CreateRepaymentBody;

  const input2 =
    body.mode === "manual" &&
    body.amountPaise === undefined &&
    body.amountRupees === undefined
      ? {
          ...body,
          amountPaise: (body.allocations ?? []).reduce(
            (s, a) => s + a.amountPaise,
            0,
          ),
        }
      : body;

  const amountPaise = resolveAmount(input2);
  if (amountPaise === null)
    throw new ApiError(
      400,
      "amountPaise or amountRupees is required and must be > 0, not both",
    );

  const cust = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, body.customerId), eq(customers.userId, userId)))
    .limit(1);
  if (!cust[0]) throw new ApiError(404, "customer not found");

  let pairs: Array<{ sourceId: string; amountPaise: number }>;
  if (body.mode === "fifo") {
    const queue = await fifoOrder(db, userId, body.customerId);
    const availableTotal = queue.reduce((s, q) => s + q.outstanding, 0);
    if (availableTotal < amountPaise)
      throw new ApiError(400, "repayment exceeds total outstanding");
    pairs = [];
    let left = amountPaise;
    for (const q of queue) {
      if (left <= 0) break;
      const give = Math.min(q.outstanding, left);
      pairs.push({ sourceId: q.sourceId, amountPaise: give });
      left -= give;
    }
  } else {
    const manual = body.allocations ?? [];
    const sum = manual.reduce((s, a) => s + a.amountPaise, 0);
    if (sum !== amountPaise)
      throw new ApiError(
        400,
        `allocation total ${sum} must equal repayment amount ${amountPaise}`,
      );
    const seen = new Set<string>();
    for (const a of manual) {
      if (seen.has(a.sourceId))
        throw new ApiError(400, "duplicate allocation for source");
      seen.add(a.sourceId);
    }
    const breakdown = await getSourceOutstanding(db, userId, body.customerId);
    const map = new Map(
      breakdown.sources.map((s) => [s.sourceId, s.outstandingPaise]),
    );
    for (const a of manual) {
      const outstanding = map.get(a.sourceId);
      if (outstanding === undefined)
        throw new ApiError(
          400,
          "source does not belong to this customer's ledger",
        );
      if (a.amountPaise > outstanding)
        throw new ApiError(400, "allocation exceeds source outstanding");
    }
    pairs = manual;
  }

  const txnId = randomUUID();
  const occurredAtIso = body.occurredAt
    ? new Date(body.occurredAt as string).toISOString()
    : new Date().toISOString();

  const created = await db.transaction(async (tx) => {
    const tdb = tx as unknown as DbClient;
    for (const p of pairs) {
      const srcRows = await tdb
        .select()
        .from(fundingSources)
        .where(
          and(
            eq(fundingSources.id, p.sourceId),
            eq(fundingSources.userId, userId),
          ),
        )
        .limit(1);
      const src = srcRows[0];
      if (!src) throw new ApiError(404, "funding source not found");
      if (src.status !== "active")
        throw new ApiError(400, "funding source is deactivated");
      if (src.kind === "credit_card") {
        const nextUsed = (src.usedPaise ?? 0) - p.amountPaise;
        if (nextUsed < 0)
          throw new ApiError(400, "allocation would overpay a credit card");
        await tdb
          .update(fundingSources)
          .set({ usedPaise: nextUsed, updatedAt: new Date() })
          .where(eq(fundingSources.id, src.id));
      } else {
        await tdb
          .update(fundingSources)
          .set({
            currentBalancePaise: (src.currentBalancePaise ?? 0) + p.amountPaise,
            updatedAt: new Date(),
          })
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
        customerId: body.customerId,
        sourceId: null,
        occurredAt: new Date(occurredAtIso),
        note: body.note ?? null,
        createdBy: userId,
      })
      .returning();
    if (!txn) throw new ApiError(500, "failed to create repayment");

    const allocRows = await tdb
      .insert(transactionAllocations)
      .values(
        pairs.map((p) => ({
          userId,
          transactionId: txn.id,
          customerId: body.customerId,
          sourceId: p.sourceId,
          amountPaise: p.amountPaise,
        })),
      )
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

  return res.status(201).json({
    transaction: toTransactionDto(created.transaction),
    allocations: created.allocations.map((a) => ({
      id: a.id,
      sourceId: a.sourceId,
      amountPaise: a.amountPaise,
    })),
  });
};
