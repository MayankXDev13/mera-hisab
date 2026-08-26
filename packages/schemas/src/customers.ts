import { z } from "zod";



export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/, "invalid phone")
    .optional()
    .nullable(),
  monthlyRateBps: z.number().int().min(0).max(10000),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/, "invalid phone")
    .optional()
    .nullable(),
  monthlyRateBps: z.number().int().min(0).max(10000).optional(),
});
