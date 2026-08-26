import { z } from "zod";
import { paisePositiveSchema, paginationSchema, dateRangeQuerySchema } from "./common.js";

export const transactionDirectionSchema = z.enum(["debit", "credit"]);

export const createTransactionSchema = z
  .object({
    direction: transactionDirectionSchema,
    customerId: z.string().uuid(),
    // funding_sources.id — kind lives on the row, not the request
    sourceId: z.string().uuid(),
    amountPaise: paisePositiveSchema.optional(),
    amountRupees: z.union([z.string(), z.number()]).optional(),
    occurredAt: z.string().datetime().or(z.date()).optional(),
    note: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => v.amountPaise !== undefined || v.amountRupees !== undefined, {
    message: "amountPaise or amountRupees is required",
    path: ["amountPaise"],
  })
  .refine((v) => !(v.amountPaise !== undefined && v.amountRupees !== undefined), {
    message: "provide amountPaise or amountRupees, not both",
    path: ["amountRupees"],
  });

export const transactionFilterQuerySchema = paginationSchema
  .merge(dateRangeQuerySchema)
  .merge(
    z.object({
      customerId: z.string().uuid().optional(),
      direction: z.enum(["debit", "credit"]).optional(),
    }),
  );

export const outstandingParamsSchema = z.object({
  customerId: z.string().uuid(),
});
