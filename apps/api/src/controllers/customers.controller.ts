import type { Request, Response, RequestHandler } from "express";
import { and, asc, eq } from "@repo/db";
import { db } from "@repo/db";
import type { createCustomerSchema, updateCustomerSchema } from "@repo/schemas";
import type { z } from "zod";
import type { BodyRequest } from "@repo/schemas";
import { customers, auditLogs } from "@repo/db/schema";
import { toCustomerDto, toTransactionDto } from "../lib/dto.js";
import { LedgerError } from "../services/ledger.service.js";
import {
  getOutstandingQuery,
  getOutstandingBatchQuery,
} from "../services/queries.service.js";
import {
  createRepayment,
  getSourceOutstanding,
} from "../services/repayment.service.js";
import type { createRepaymentSchema } from "@repo/schemas";

type CreateRepaymentBody = z.infer<typeof createRepaymentSchema>;
import { getActor } from "../lib/actor.js";

type CreateCustomerBody = z.infer<typeof createCustomerSchema>;
type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>;

export const listCustomers: RequestHandler = async (req, res) => {
  const userId = getActor(req);
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId!))
    .orderBy(asc(customers.createdAt));
  return res.json({ customers: rows.map(toCustomerDto) });
};

export const getCustomer: RequestHandler = async (req, res) => {
  const userId = getActor(req);
  const { id } = req.params as { id: string };
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId!)))
    .limit(1);
  if (!rows[0]) return res.status(404).json({ error: "customer not found" });
  return res.json({ customer: toCustomerDto(rows[0]) });
};

export const createCustomer = async (req: Request, res: Response) => {
  const userId = getActor(req)!;
  const body = (req as unknown as BodyRequest<CreateCustomerBody>)
    .validatedBody;
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
    if (!row)
      return res.status(500).json({ error: "failed to create customer" });
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
      return res.status(409).json({ error: "username already exists" });
    }
    return res.status(500).json({ error: msg });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const userId = getActor(req)!;
  const { id } = req.params as { id: string };
  const body = (req as unknown as BodyRequest<UpdateCustomerBody>)
    .validatedBody;

  const existing = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
    .limit(1);
  if (!existing[0])
    return res.status(404).json({ error: "customer not found" });
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
    if (!row) return res.status(404).json({ error: "customer not found" });

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
      return res.status(409).json({ error: "username already exists" });
    }
    return res.status(500).json({ error: msg });
  }
};

export const getOutstanding: RequestHandler = async (req, res) => {
  const userId = getActor(req as Request)!;
  const { id } = req.params as { id: string };
  try {
    const breakdown = await getSourceOutstanding(userId, id);
    return res.json({
      customerId: id,
      outstandingPaise: breakdown.total,
      sources: breakdown.sources,
    });
  } catch (e) {
    if (e instanceof LedgerError)
      return res.status(e.statusCode).json({ error: e.message });
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const createRepaymentHandler = async (req: Request, res: Response) => {
  const userId = getActor(req as Request)!;
  const body = (req as unknown as BodyRequest<CreateRepaymentBody>)
    .validatedBody;
  try {
    const result = await createRepayment(userId, body);
    return res.status(201).json({
      transaction: toTransactionDto(result.transaction),
      allocations: result.allocations.map((a) => ({
        id: a.id,
        sourceId: a.sourceId,
        amountPaise: a.amountPaise,
      })),
    });
  } catch (e) {
    if (e instanceof LedgerError)
      return res.status(e.statusCode).json({ error: e.message });
    return res.status(500).json({ error: (e as Error).message });
  }
};

export const getOutstandingBatch: RequestHandler = async (req, res) => {
  const userId = getActor(req)!;
  const { ids } = req.query as { ids?: string | string[] };
  const list = Array.isArray(ids) ? ids : ids ? ids.split(",") : [];
  if (list.length === 0) return res.json({ outstandings: {} });
  const outstandings = await getOutstandingBatchQuery(userId, list);
  return res.json({ outstandings });
};
