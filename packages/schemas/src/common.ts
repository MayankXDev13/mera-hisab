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

export const MAX_PAISE_INT32 = 2147483647;
export const RUPEE_AMOUNT_REGEX = /^\d+(\.\d{0,2})?$/;

/** Convert rupees (may be "1234.56" or 1234.56) to integer paise without float loss. */
export function rupeesToPaise(input: string | number): number {
  const s = String(input).trim();
  if (s === "") return NaN;
  const parts = s.split(".");
  const rupeesPart = parts[0] ?? "0";
  const rupees = parseInt(rupeesPart || "0", 10);
  if (Number.isNaN(rupees)) return NaN;
  const paiseStr = (parts[1] ?? "").padEnd(2, "0").slice(0, 2);
  const paise = paiseStr ? parseInt(paiseStr, 10) : 0;
  if (Number.isNaN(paise)) return NaN;
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

export function amountToPaiseOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (!RUPEE_AMOUNT_REGEX.test(trimmed)) return null;
  const paise = rupeesToPaise(trimmed);
  if (!Number.isFinite(paise) || paise <= 0 || paise > MAX_PAISE_INT32) return null;
  return paise;
}

export function resolveAmount(body: { amountPaise?: number; amountRupees?: string | number }): number | null {
  if (body.amountPaise !== undefined && body.amountRupees !== undefined) return null;
  if (body.amountPaise !== undefined) {
    if (!Number.isInteger(body.amountPaise) || body.amountPaise <= 0 || body.amountPaise > MAX_PAISE_INT32) return null;
    return body.amountPaise;
  }
  if (body.amountRupees !== undefined) {
    const paise = rupeesToPaise(body.amountRupees);
    if (!Number.isInteger(paise) || paise <= 0 || paise > MAX_PAISE_INT32) return null;
    return paise;
  }
  return null;
}
