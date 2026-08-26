import type { Request, Response } from "express";
import { eq, desc, and } from "@repo/db";
import { randomUUID } from "node:crypto";
import { db as _db } from "@repo/db";
const db: any = _db;
import { accounts, creditCards, customers, transactions, auditLogs } from "@repo/db/schema";
import { toTransactionDto } from "../lib/dto.js";
import { rupeesToPaise } from "@repo/schemas";

function getActor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

function resolveAmount(body: { amountPaise?: number; amountRupees?: string | number }): number | null {
  if (body.amountPaise !== undefined && body.amountRupees !== undefined) return null;
  if (body.amountPaise !== undefined) {
    if (!Number.isInteger(body.amountPaise) || body.amountPaise <= 0) return null;
    return body.amountPaise;
  }
  if (body.amountRupees !== undefined) {
    const paise = rupeesToPaise(body.amountRupees);
    if (!Number.isInteger(paise) || paise <= 0) return null;
    return paise;
  }
  return null;
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
  const amountPaise = resolveAmount(body);
  if (amountPaise === null) {
    return res.status(400).json({ error: "amountPaise or amountRupees is required and must be >0, not both" });
  }

  const occurredAt = body.occurredAt ? new Date(body.occurredAt as string).toISOString() : new Date().toISOString();
  const id = randomUUID();

  const customer = await (db as any).select().from(customers).where(eq(customers.id as any, body.customerId as any)).limit(1);
  if (!customer[0]) return res.status(404).json({ error: "customer not found" });

  try {
    const created = await (db as any).transaction(async (tx: any) => {
      if (body.sourceType === "account") {
        const accRows = await (tx as any).select().from(accounts).where(eq(accounts.id as any, body.sourceId as any)).limit(1);
        if (!accRows[0]) throw Object.assign(new Error("account not found"), { statusCode: 404 });
        const acc = accRows[0]!;
        if (acc.status !== "active") throw Object.assign(new Error("account is deactivated"), { statusCode: 400 });

        if (body.direction === "debit") {
          if (acc.currentBalancePaise < amountPaise) throw Object.assign(new Error("insufficient account balance"), { statusCode: 400 });
          await (tx as any).update(accounts).set({ currentBalancePaise: acc.currentBalancePaise - amountPaise, updatedAt: new Date() }).where(eq(accounts.id as any, acc.id as any));
        } else {
          await (tx as any).update(accounts).set({ currentBalancePaise: acc.currentBalancePaise + amountPaise, updatedAt: new Date() }).where(eq(accounts.id as any, acc.id as any));
        }

        const [row] = await tx
          .insert(transactions)
          .values({
            id,
            direction: body.direction,
            amountPaise,
            customerId: body.customerId,
            sourceType: body.sourceType,
            sourceId: body.sourceId,
            occurredAt: new Date(occurredAt),
            note: body.note ?? null,
            createdBy: actorId,
            monthlyChargeId: body.monthlyChargeId ?? null,
          })
          .returning();
        if (!row) throw Object.assign(new Error("failed to create transaction"), { statusCode: 500 });

        await (tx as any).insert(auditLogs).values({
          actorId,
          action: "transaction.create",
          entityType: "transaction",
          entityId: row.id,
          before: null,
          after: row as unknown as never,
        });
        return row;
      } else {
        const cardRows = await (tx as any).select().from(creditCards).where(eq(creditCards.id as any, body.sourceId as any)).limit(1);
        if (!cardRows[0]) throw Object.assign(new Error("card not found"), { statusCode: 404 });
        const card = cardRows[0]!;
        if (card.status !== "active") throw Object.assign(new Error("card is deactivated"), { statusCode: 400 });

        if (body.direction === "debit") {
          const available = card.totalLimitPaise - card.usedPaise;
          if (available < amountPaise) throw Object.assign(new Error("insufficient card limit"), { statusCode: 400 });
          await (tx as any).update(creditCards).set({ usedPaise: card.usedPaise + amountPaise, updatedAt: new Date() }).where(eq(creditCards.id as any, card.id as any));
        } else {
          const nextUsed = Math.max(0, card.usedPaise - amountPaise);
          await (tx as any).update(creditCards).set({ usedPaise: nextUsed, updatedAt: new Date() }).where(eq(creditCards.id as any, card.id as any));
        }

        const [row] = await tx
          .insert(transactions)
          .values({
            id,
            direction: body.direction,
            amountPaise,
            customerId: body.customerId,
            sourceType: body.sourceType,
            sourceId: body.sourceId,
            occurredAt: new Date(occurredAt),
            note: body.note ?? null,
            createdBy: actorId,
            monthlyChargeId: body.monthlyChargeId ?? null,
          })
          .returning();
        if (!row) throw Object.assign(new Error("failed to create transaction"), { statusCode: 500 });

        await (tx as any).insert(auditLogs).values({
          actorId,
          action: "transaction.create",
          entityType: "transaction",
          entityId: row.id,
          before: null,
          after: row as unknown as never,
        });
        return row;
      }
    });

    return res.status(201).json({ transaction: toTransactionDto(created) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
};

export const reverseTransaction = async (req: Request, res: Response) => {
  const { id: transactionId } = req.params;
  const actorId = getActor(req);
  const newId = randomUUID();

  const origRows = await (db as any).select().from(transactions).where(eq(transactions.id as any, transactionId! as any)).limit(1);
  if (!origRows[0]) return res.status(404).json({ error: "transaction not found" });
  const orig = origRows[0]!;
  const revDir = orig.direction === "debit" ? "credit" : "debit";

  try {
    const created = await (db as any).transaction(async (tx: any) => {
      const freshRows = await (tx as any).select().from(transactions).where(eq(transactions.id as any, transactionId! as any)).limit(1);
      if (!freshRows[0]) throw Object.assign(new Error("transaction not found"), { statusCode: 404 });
      const fresh = freshRows[0]!;

      if (fresh.sourceType === "account") {
        const accRows = await (tx as any).select().from(accounts).where(eq(accounts.id as any, fresh.sourceId as any)).limit(1);
        if (!accRows[0]) throw Object.assign(new Error("account not found"), { statusCode: 404 });
        const acc = accRows[0]!;
        if (revDir === "debit") {
          if (acc.currentBalancePaise < fresh.amountPaise) throw Object.assign(new Error("insufficient account balance"), { statusCode: 400 });
          await (tx as any).update(accounts).set({ currentBalancePaise: acc.currentBalancePaise - fresh.amountPaise, updatedAt: new Date() }).where(eq(accounts.id as any, acc.id as any));
        } else {
          await (tx as any).update(accounts).set({ currentBalancePaise: acc.currentBalancePaise + fresh.amountPaise, updatedAt: new Date() }).where(eq(accounts.id as any, acc.id as any));
        }
      } else {
        const cardRows = await (tx as any).select().from(creditCards).where(eq(creditCards.id as any, fresh.sourceId as any)).limit(1);
        if (!cardRows[0]) throw Object.assign(new Error("card not found"), { statusCode: 404 });
        const card = cardRows[0]!;
        if (revDir === "debit") {
          const available = card.totalLimitPaise - card.usedPaise;
          if (available < fresh.amountPaise) throw Object.assign(new Error("insufficient card limit"), { statusCode: 400 });
          await (tx as any).update(creditCards).set({ usedPaise: card.usedPaise + fresh.amountPaise, updatedAt: new Date() }).where(eq(creditCards.id as any, card.id as any));
        } else {
          await (tx as any).update(creditCards).set({ usedPaise: Math.max(0, card.usedPaise - fresh.amountPaise), updatedAt: new Date() }).where(eq(creditCards.id as any, card.id as any));
        }
      }

      const [row] = await tx
        .insert(transactions)
        .values({
          id: newId,
          direction: revDir as "debit" | "credit",
          amountPaise: fresh.amountPaise,
          customerId: fresh.customerId,
          sourceType: fresh.sourceType,
          sourceId: fresh.sourceId,
          occurredAt: new Date(),
          note: `Reversal of ${fresh.id}`,
          createdBy: actorId,
          reversedFromId: fresh.id,
        })
        .returning();
      if (!row) throw Object.assign(new Error("failed to create reversal"), { statusCode: 500 });

      await (tx as any).insert(auditLogs).values({
        actorId,
        action: "transaction.reverse",
        entityType: "transaction",
        entityId: row.id,
        before: fresh as unknown as never,
        after: row as unknown as never,
      });
      return row;
    });

    return res.status(201).json({ transaction: toTransactionDto(created) });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: err.message });
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
