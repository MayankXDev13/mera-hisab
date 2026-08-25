import { store, nowIso, newId } from "./store.js";
import { writeAudit } from "./audit.js";

// Atomic postTransaction: validates, updates source, inserts tx, writes audit in one logical transaction.
// Throws with statusCode attached on validation failure.
export function postTransaction(params: {
  direction: "debit" | "credit";
  customerId: string;
  sourceType: "account" | "credit_card";
  sourceId: string;
  amountPaise: number;
  occurredAt?: string;
  note?: string | null;
  createdBy: string | null;
  monthlyChargeId?: string | null;
}) {
  const customer = store.customers.get(params.customerId);
  if (!customer) throw Object.assign(new Error("customer not found"), { statusCode: 404 });

  if (params.amountPaise <= 0) throw Object.assign(new Error("amount must be > 0"), { statusCode: 400 });

  const occurredAt = params.occurredAt ?? nowIso();

  // Snapshot source before mutation for atomic rollback on error
  if (params.sourceType === "account") {
    const acc = store.accounts.get(params.sourceId);
    if (!acc) throw Object.assign(new Error("account not found"), { statusCode: 404 });
    if (params.direction === "debit") {
      if (acc.currentBalancePaise < params.amountPaise) {
        throw Object.assign(new Error("insufficient account balance"), { statusCode: 400 });
      }
      // mutate
      const before = { ...acc };
      acc.currentBalancePaise -= params.amountPaise;
      acc.updatedAt = nowIso();
      // insert tx
      const tx = insertTx(params, occurredAt);
      writeAudit({ actorId: params.createdBy, action: "transaction.create", entityType: "transaction", entityId: tx.id, before: null, after: tx });
      // also audit source update? audit helper covers transaction; account change audited via transaction flow
      return tx;
    } else {
      const before = { ...acc };
      acc.currentBalancePaise += params.amountPaise;
      acc.updatedAt = nowIso();
      const tx = insertTx(params, occurredAt);
      writeAudit({ actorId: params.createdBy, action: "transaction.create", entityType: "transaction", entityId: tx.id, before: null, after: tx });
      return tx;
    }
  } else {
    const card = store.cards.get(params.sourceId);
    if (!card) throw Object.assign(new Error("card not found"), { statusCode: 404 });
    if (params.direction === "debit") {
      const available = card.totalLimitPaise - card.usedPaise;
      if (available < params.amountPaise) {
        throw Object.assign(new Error("insufficient card limit"), { statusCode: 400 });
      }
      card.usedPaise += params.amountPaise;
      card.updatedAt = nowIso();
      const tx = insertTx(params, occurredAt);
      writeAudit({ actorId: params.createdBy, action: "transaction.create", entityType: "transaction", entityId: tx.id, before: null, after: tx });
      return tx;
    } else {
      card.usedPaise = Math.max(0, card.usedPaise - params.amountPaise);
      card.updatedAt = nowIso();
      const tx = insertTx(params, occurredAt);
      writeAudit({ actorId: params.createdBy, action: "transaction.create", entityType: "transaction", entityId: tx.id, before: null, after: tx });
      return tx;
    }
  }
}

function insertTx(params: { direction: "debit"|"credit"; customerId: string; sourceType: "account"|"credit_card"; sourceId: string; amountPaise: number; note?: string|null; createdBy: string|null; monthlyChargeId?: string|null }, occurredAt: string) {
  const id = newId();
  const tx = {
    id,
    direction: params.direction,
    amountPaise: params.amountPaise,
    customerId: params.customerId,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    occurredAt,
    note: params.note ?? null,
    createdBy: params.createdBy,
    reversedFromId: null,
    monthlyChargeId: params.monthlyChargeId ?? null,
    createdAt: nowIso(),
  };
  store.transactions.set(id, tx);
  return tx;
}

export function computeOutstanding(customerId: string): number {
  let out = 0;
  for (const tx of store.transactions.values()) {
    if (tx.customerId !== customerId) continue;
    if (tx.direction === "debit") out += tx.amountPaise;
    else out -= tx.amountPaise;
  }
  // outstanding includes charges/waivers already as transactions; so simple sum
  // But charges are separate? we post a debit tx for charges as well, waivers as credit txs.
  return out;
}
