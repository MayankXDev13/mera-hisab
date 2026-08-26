import { z } from "zod";

export const customerStatusSchema = z.enum(["active", "deactivated"]);

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "invalid username"),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/, "invalid phone")
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
  monthlyRateBps: z.number().int().min(0).max(10000),
  status: customerStatusSchema.optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "invalid username").optional(),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/, "invalid phone")
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
  monthlyRateBps: z.number().int().min(0).max(10000).optional(),
  status: customerStatusSchema.optional(),
});
