
import type { Request, Response } from "express";
import { eq, asc } from "@repo/db";
import { db as _db } from "@repo/db";
const db: any = _db;
import { customers, auditLogs } from "@repo/db/schema";
import { toCustomerDto } from "../lib/dto.js";
import { LedgerError } from "../services/ledger.service.js";
import { getOutstandingQuery } from "../services/queries.service.js";

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
  const { id } = req.params as { id: string };
  try {
    const outstandingPaise = await getOutstandingQuery(id, { db });
    return res.json({ customerId: id, outstandingPaise });
  } catch (e) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const getOutstandingBatch = async (req: Request, res: Response) => {
  const { ids } = req.query as { ids?: string | string[] };
  const list = Array.isArray(ids) ? ids : ids ? ids.split(",") : [];
  if (list.length === 0) return res.json({ outstandings: {} });
  const { getOutstandingBatchQuery } = await import("../services/queries.service.js");
  const outstandings = await getOutstandingBatchQuery(list, { db });
  return res.json({ outstandings });
};
