import { z } from "zod";
import { paisePositiveSchema } from "./common.js";

export const cardStatusSchema = z.enum(["active", "deactivated"]);

export const createCardSchema = z.object({
  issuer: z.string().min(1).max(200),
  last4: z.string().regex(/^\d{4}$/, "last4 must be exactly 4 digits"),
  totalLimitPaise: paisePositiveSchema,
});

export const updateCardSchema = z.object({
  issuer: z.string().min(1).max(200).optional(),
  last4: z
    .string()
    .regex(/^\d{4}$/, "last4 must be exactly 4 digits")
    .optional(),
  totalLimitPaise: paisePositiveSchema.optional(),
  status: cardStatusSchema.optional(),
});
