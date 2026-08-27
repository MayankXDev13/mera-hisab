import type { Request, Response } from "express";
import { and, asc, eq } from "@repo/db";
import { db } from "@repo/db";
import { customers, auditLogs, transactions } from "@repo/db/schema";
import type { createCustomerSchema, updateCustomerSchema } from "@repo/schemas";
import type { z } from "zod";

import { ApiError } from "../lib/http/errors.js";
import { asyncHandler } from "../lib/http/asyncHandler.js";

type CreateCustomerBody = z.infer<typeof createCustomerSchema>;
type UpdateCustomerBody = z.infer<typeof updateCustomerSchema>;

export const createCustomer = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const body = req.validatedBody as CreateCustomerBody;

    const [customer] = await db
      .insert(customers)
      .values({
        userId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        monthlyRateBps: body.monthlyRateBps,
      })
      .returning({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        monthlyRateBps: customers.monthlyRateBps,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      });

    if (!customer) {
      throw new ApiError(500, "Failed to create customer");
    }

    await db.insert(auditLogs).values({
      actorId: userId,
      action: "customer.create",
      entityType: "customer",
      entityId: customer.id,
      before: null,
      after: customer as unknown as never,
    });

    return res.status(201).json({ customer });
  },
);

export const listCustomers = asyncHandler(
  async (req: Request, res: Response) => {
    const allCustomers = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        monthlyRateBps: customers.monthlyRateBps,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(eq(customers.userId, req.user!.id))
      .orderBy(asc(customers.createdAt));

    return res.status(200).json({ customers: allCustomers });
  },
);

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      monthlyRateBps: customers.monthlyRateBps,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, req.user?.id!)))
    .limit(1);

  if (!customer) throw new ApiError(404, "customer not found");
  return res.status(200).json({ customer });
});

export const updateCustomer = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const body = req.validatedBody as UpdateCustomerBody;

    const userId = req.user!.id;

    const [existingCustomer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        monthlyRateBps: customers.monthlyRateBps,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .limit(1);

    if (!existingCustomer) {
      throw new ApiError(404, "customer not found");
    }

    if (
      body.name === existingCustomer.name &&
      body.email === existingCustomer.email &&
      body.phone === existingCustomer.phone &&
      body.monthlyRateBps === existingCustomer.monthlyRateBps
    ) {
      return res.status(200).json({ customer: existingCustomer });
    }

    const [updatedCustomer] = await db
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
      .returning({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        monthlyRateBps: customers.monthlyRateBps,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      });

    if (!updatedCustomer) {
      throw new ApiError(404, "customer not found");
    }

    await db.insert(auditLogs).values({
      actorId: userId,
      action: "customer.update",
      entityType: "customer",
      entityId: updatedCustomer.id,
      before: existingCustomer as unknown as never,
      after: updatedCustomer as unknown as never,
    });

    return res.json({
      customer: updatedCustomer,
    });
  },
);

export const deleteCustomer = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const customer = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, req.user!.id)))
      .returning({ id: customers.id });

    if (customer.length === 0) {
      throw new ApiError(404, "customer not found");
    }

    return res.status(200).json({ message: "Customer deleted successfully" });
  },
);
