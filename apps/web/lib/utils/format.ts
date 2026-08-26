export { formatRupees, rupeesToPaise, amountToPaiseOrNull, resolveAmount, MAX_PAISE_INT32, RUPEE_AMOUNT_REGEX } from "@repo/schemas";

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
