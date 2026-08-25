import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const paiseSchema = z.number().int().min(0, "amount must be >= 0");
export const paisePositiveSchema = z.number().int().positive("amount must be > 0");

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const accountTypeSchema = z.enum(["savings", "current"]);
export const accountStatusSchema = z.enum(["active", "deactivated"]);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  type: accountTypeSchema,
  openingBalancePaise: paiseSchema,
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: accountTypeSchema.optional(),
});

// ---------------------------------------------------------------------------
// Credit cards
// ---------------------------------------------------------------------------

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
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

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
  monthlyRatePct: z.number().min(0).max(100),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/)
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
  monthlyRatePct: z.number().min(0).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const transactionDirectionSchema = z.enum(["debit", "credit"]);
export const sourceTypeSchema = z.enum(["account", "credit_card"]);
export const chargeStatusSchema = z.enum(["applied", "waived", "reduced"]);

export const createTransactionSchema = z.object({
  direction: transactionDirectionSchema,
  customerId: z.string().uuid(),
  sourceType: sourceTypeSchema,
  sourceId: z.string().uuid(),
  amountPaise: paisePositiveSchema,
  occurredAt: z.string().datetime().or(z.date()).optional(),
  note: z.string().max(2000).optional().nullable(),
});

// ---------------------------------------------------------------------------
// Monthly charges / waivers
// ---------------------------------------------------------------------------

export const waiverSchema = z.object({
  amountPaise: paisePositiveSchema.optional(), // omit => full waiver
});

// ---------------------------------------------------------------------------
// Pagination / filters
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------

/** Convert rupees (may be "1234.56" or 1234.56) to integer paise without float loss. */
export function rupeesToPaise(input: string | number): number {
  const s = String(input).trim();
  const parts = s.split(".");
  const rupees = parseInt(parts[0] ?? "0", 10);
  const paiseStr = (parts[1] ?? "").padEnd(2, "0").slice(0, 2);
  const paise = paiseStr ? parseInt(paiseStr, 10) : 0;
  const sign = s.startsWith("-") ? -1 : 1;
  return sign * (Math.abs(rupees) * 100 + paise);
}

/** Format paise as ₹ with Indian grouping. */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountType = z.infer<typeof accountTypeSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
