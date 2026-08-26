import type { accounts, creditCards, customers, transactions } from "@repo/db/schema";

function toIso(d: Date | string): string {
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

export function toAccountDto(row: typeof accounts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    openingBalancePaise: row.openingBalancePaise,
    currentBalancePaise: row.currentBalancePaise,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function toCardDto(row: typeof creditCards.$inferSelect) {
  return {
    id: row.id,
    issuer: row.issuer,
    last4: row.last4,
    totalLimitPaise: row.totalLimitPaise,
    usedPaise: row.usedPaise,
    availablePaise: row.totalLimitPaise - row.usedPaise,
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
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    occurredAt: toIso(row.occurredAt),
    note: row.note,
    createdBy: row.createdBy,
    reversedFromId: row.reversedFromId,
    monthlyChargeId: row.monthlyChargeId,
    createdAt: toIso(row.createdAt),
  };
}
