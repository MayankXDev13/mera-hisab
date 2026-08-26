
import type { Request, Response } from "express";
import { eq, asc } from "@repo/db";
import { db as _db } from "@repo/db";
const db: any = _db;
import { customers, transactions, auditLogs } from "@repo/db/schema";
import { toCustomerDto } from "../lib/dto.js";

function getActor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export const listCustomers = async (_req: Request, res: Response) => {
  const rows = await (db as any).select().from(customers).orderBy(asc(customers.createdAt));
  return res.json({ customers: rows.map(toCustomerDto) });
};

export const getCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = await (db as any).select().from(customers).where(eq(customers.id as any, id! as any)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "customer not found" });
  return res.json({ customer: toCustomerDto(rows[0]!) });
};

export const createCustomer = async (req: Request, res: Response) => {
  const body = (req as unknown as {
    validatedBody: {
      name: string;
      username: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
      monthlyRateBps: number;
      status?: "active" | "deactivated";
    };
  }).validatedBody;
  const actorId = getActor(req);
  try {
    const [row] = await db
      .insert(customers)
      .values({
        name: body.name,
        username: body.username,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        monthlyRateBps: body.monthlyRateBps,
        status: body.status ?? "active",
      })
      .returning();
    if (!row) return res.status(500).json({ error: "failed to create customer" });
    await (db as any).insert(auditLogs).values({
      actorId,
      action: "customer.create",
      entityType: "customer",
      entityId: row.id,
      before: null,
      after: row as unknown as never,
    });
    return res.status(201).json({ customer: toCustomerDto(row) });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("customers_username_unique") || msg.includes("duplicate key") || msg.includes("unique")) {
      return res.status(409).json({ error: "username already exists" });
    }
    return res.status(500).json({ error: msg });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = (req as unknown as {
    validatedBody: {
      name?: string;
      username?: string;
      email?: string | null;
      phone?: string | null;
      notes?: string | null;
      monthlyRateBps?: number;
      status?: "active" | "deactivated";
    };
  }).validatedBody;
  const actorId = getActor(req);

  const existing = await (db as any).select().from(customers).where(eq(customers.id as any, id! as any)).limit(1);
  if (!existing[0]) return res.status(404).json({ error: "customer not found" });
  const before = existing[0]!;

  try {
    const [row] = await db
      .update(customers)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.monthlyRateBps !== undefined ? { monthlyRateBps: body.monthlyRateBps } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(customers.id as any, id! as any))
      .returning();
    if (!row) return res.status(404).json({ error: "customer not found" });

    await (db as any).insert(auditLogs).values({
      actorId,
      action: "customer.update",
      entityType: "customer",
      entityId: row.id,
      before: before as unknown as never,
      after: row as unknown as never,
    });

    return res.json({ customer: toCustomerDto(row) });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("customers_username_unique") || msg.includes("duplicate key")) {
      return res.status(409).json({ error: "username already exists" });
    }
    return res.status(500).json({ error: msg });
  }
};

export const getOutstanding = async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await (db as any).select().from(customers).where(eq(customers.id as any, id! as any)).limit(1);
  if (!customer[0]) return res.status(404).json({ error: "customer not found" });

  const txs = await (db as any).select().from(transactions).where(eq(transactions.customerId as any, id! as any));
  let outstandingPaise = 0;
  for (const t of txs) {
    if (t.direction === "debit") outstandingPaise += t.amountPaise;
    else outstandingPaise -= t.amountPaise;
  }
  return res.json({ customerId: id, outstandingPaise });
};
