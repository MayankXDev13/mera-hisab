import { randomUUID } from "node:crypto";

export type User = { id: string; email: string; passwordHash: string; name: string; role: string; createdAt: string };
export type Account = { id: string; name: string; type: "savings"|"current"; openingBalancePaise: number; currentBalancePaise: number; status: "active"|"deactivated"; createdAt: string; updatedAt: string };
export type CreditCard = { id: string; issuer: string; last4: string; totalLimitPaise: number; usedPaise: number; status: "active"|"deactivated"; createdAt: string; updatedAt: string };
export type Customer = { id: string; name: string; username: string; email: string|null; phone: string|null; notes: string|null; monthlyRateBps: number; status: "active"|"deactivated"; createdAt: string; updatedAt: string };
export type Transaction = { id: string; direction: "debit"|"credit"; amountPaise: number; customerId: string; sourceType: "account"|"credit_card"; sourceId: string; occurredAt: string; note: string|null; createdBy: string|null; reversedFromId: string|null; monthlyChargeId: string|null; createdAt: string };
export type MonthlyCharge = { id: string; customerId: string; periodMonth: string; rateSnapshotBps: number; baseAmountPaise: number; chargeAmountPaise: number; status: "applied"|"waived"|"reduced"; waivedAmountPaise: number; createdAt: string; updatedAt: string };
export type AuditLog = { id: string; actorId: string|null; action: string; entityType: string; entityId: string; before: string|null; after: string|null; createdAt: string };

export const store = {
  users: new Map<string, User>(),
  usersByEmail: new Map<string, string>(),
  accounts: new Map<string, Account>(),
  cards: new Map<string, CreditCard>(),
  customers: new Map<string, Customer>(),
  customersByUsername: new Map<string, string>(),
  transactions: new Map<string, Transaction>(),
  charges: new Map<string, MonthlyCharge>(),
  chargeKey: new Map<string, string>(), // customerId:periodMonth -> chargeId
  auditLogs: [] as AuditLog[],
};

export function resetStore() {
  store.users.clear(); store.usersByEmail.clear(); store.accounts.clear(); store.cards.clear(); store.customers.clear(); store.customersByUsername.clear(); store.transactions.clear(); store.charges.clear(); store.chargeKey.clear(); store.auditLogs.length = 0;
}

export function newId() { return randomUUID(); }
export function nowIso() { return new Date().toISOString(); }
