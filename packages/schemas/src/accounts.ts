import { z } from "zod";
import { paiseSchema } from "./common.js";

export const fundingSourceKindSchema = z.enum(["bank_account", "credit_card"]);
export const fundingSourceStatusSchema = z.enum(["active", "deactivated"]);

// POST /api/accounts — kind is implied by the route
export const createBankAccountSchema = z.object({
  name: z.string().min(1).max(200),
  openingBalancePaise: paiseSchema,
});

export const updateBankAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: fundingSourceStatusSchema.optional(),
});

/** @deprecated legacy alias kept for one release */
export const accountTypeSchema = z.enum(["savings", "current"]);
