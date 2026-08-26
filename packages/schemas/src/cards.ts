import { z } from "zod";
import { paisePositiveSchema } from "./common.js";

// POST /api/cards — kind is implied by the route
export const createCardSchema = z.object({
  issuer: z.string().min(1).max(200),
  last4: z.string().regex(/^\d{4}$/, "last4 must be 4 digits"),
  totalLimitPaise: paisePositiveSchema,
});

export const updateCardSchema = z.object({
  issuer: z.string().min(1).max(200).optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
  totalLimitPaise: paisePositiveSchema.optional(),
  status: z.enum(["active", "deactivated"]).optional(),
});
