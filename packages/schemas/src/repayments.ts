import { z } from "zod";
import { paisePositiveSchema } from "./common.js";

/**
 * mode = fifo   → service computes allocations oldest-outstanding-first.
 * mode = manual → allocations required, must sum exactly to the amount.
 */
export const createRepaymentSchema = z
  .object({
    customerId: z.string().uuid(),
    mode: z.enum(["fifo", "manual"]),
    amountPaise: paisePositiveSchema.optional(),
    amountRupees: z.union([z.string(), z.number()]).optional(),
    occurredAt: z.string().datetime().or(z.date()).optional(),
    note: z.string().max(2000).optional().nullable(),
    allocations: z
      .array(
        z.object({
          sourceId: z.string().uuid(),
          amountPaise: paisePositiveSchema,
        }),
      )
      .min(1)
      .max(100)
      .optional(),
  })
  .refine((v) => v.amountPaise !== undefined || v.amountRupees !== undefined, {
    message: "amountPaise or amountRupees is required",
    path: ["amountPaise"],
  })
  .refine((v) => !(v.amountPaise !== undefined && v.amountRupees !== undefined), {
    message: "provide amountPaise or amountRupees, not both",
    path: ["amountRupees"],
  })
  .refine((v) => v.mode !== "manual" || (v.allocations?.length ?? 0) > 0, {
    message: "manual mode requires allocations",
    path: ["allocations"],
  });

export type CreateRepaymentInput = z.infer<typeof createRepaymentSchema>;
