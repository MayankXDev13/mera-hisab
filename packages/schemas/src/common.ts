import { z } from "zod";

export const paiseSchema = z.number().int().min(0, "amount must be >= 0");
export const paisePositiveSchema = z.number().int().positive("amount must be > 0");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeQuerySchema = z.object({
  from: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid from date" })
    .optional(),
  to: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid to date" })
    .optional(),
});

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

/** Format paise as INR. */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}
