function toIso(d: Date | string): string {
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

export function toAccountDto(row: {
  id: string;
  name: string;
  type: string;
  openingBalancePaise: number;
  currentBalancePaise: number;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
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

export function toCardDto(row: {
  id: string;
  issuer: string;
  last4: string;
  totalLimitPaise: number;
  usedPaise: number;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
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

export function toCustomerDto(row: {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  monthlyRateBps: number;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}) {
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

export function toTransactionDto(row: {
  id: string;
  direction: string;
  amountPaise: number;
  customerId: string;
  sourceType: string;
  sourceId: string;
  occurredAt: Date | string;
  note: string | null;
  createdBy: string | null;
  reversedFromId: string | null;
  monthlyChargeId: string | null;
  createdAt: Date | string;
}) {
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
