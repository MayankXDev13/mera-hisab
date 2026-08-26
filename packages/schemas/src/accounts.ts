import { z } from "zod";
import { paiseSchema } from "./common.js";

export const accountTypeSchema = z.enum(["savings", "current"]);
export const accountStatusSchema = z.enum(["active", "deactivated"]);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  type: accountTypeSchema.default("savings"),
  openingBalancePaise: paiseSchema,
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: accountTypeSchema.optional(),
  status: accountStatusSchema.optional(),
});
