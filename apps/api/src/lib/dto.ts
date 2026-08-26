import type { customers, fundingSources, transactions } from "@repo/db/schema";

function toIso(d: Date | string): string {
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

type FundingSourceRow = typeof fundingSources.$inferSelect;

/** Bank-account view of a funding source row (kind = bank_account). */
export function toAccountDto(row: FundingSourceRow) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalancePaise: row.openingBalancePaise ?? 0,
    currentBalancePaise: row.currentBalancePaise ?? 0,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Credit-card view of a funding source row (kind = credit_card). */
export function toCardDto(row: FundingSourceRow) {
  const totalLimitPaise = row.totalLimitPaise ?? 0;
  const usedPaise = row.usedPaise ?? 0;
  return {
    id: row.id,
    issuer: row.issuer ?? row.name,
    last4: row.last4 ?? "",
    totalLimitPaise,
    usedPaise,
    availablePaise: totalLimitPaise - usedPaise,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function toCustomerDto(row: typeof customers.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    monthlyRateBps: row.monthlyRateBps,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function toTransactionDto(row: typeof transactions.$inferSelect) {
  return {
    id: row.id,
    direction: row.direction,
    amountPaise: row.amountPaise,
    customerId: row.customerId,
    sourceId: row.sourceId,
    occurredAt: toIso(row.occurredAt),
    note: row.note,
    createdBy: row.createdBy,
    createdAt: toIso(row.createdAt),
  };
}
