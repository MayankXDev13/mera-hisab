import { store, nowIso, newId } from "./store.js";
import { postTransaction, computeOutstanding } from "./transactions.js";
import { writeAudit } from "./audit.js";

export function periodForDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function chargeAmountPaise(base: number, rateBps: number): number {
  // base * rateBps / 10000, rounded to nearest paise
  return Math.round((base * rateBps) / 10000);
}

export function runMonthlyCharges(opts: { now?: Date; actorId: string | null; dummySourceId?: string }): { created: number; skipped: number } {
  const now = opts.now ?? new Date();
  const period = periodForDate(now);
  let created = 0, skipped = 0;

  // Ensure a dummy source account exists for charge transactions (internal)
  // Use first active account or create internal placeholder
  let dummyAccountId = opts.dummySourceId ?? null;
  if (!dummyAccountId) {
    for (const a of store.accounts.values()) if (a.status === "active") { dummyAccountId = a.id; break; }
    if (!dummyAccountId) {
      // create internal system account for charges
      const id = newId();
      store.accounts.set(id, { id, name: "_system_charges", type: "savings", openingBalancePaise: 0, currentBalancePaise: 0, status: "active", createdAt: nowIso(), updatedAt: nowIso() });
      dummyAccountId = id;
    }
  }

  for (const cust of store.customers.values()) {
    if (cust.status !== "active") { skipped++; continue; }
    const key = `${cust.id}:${period}`;
    if (store.chargeKey.has(key)) { skipped++; continue; }
    const outstanding = computeOutstanding(cust.id);
    if (outstanding <= 0) { skipped++; continue; }
    const base = outstanding;
    const charge = chargeAmountPaise(base, cust.monthlyRateBps);
    if (charge <= 0) { skipped++; continue; }
    const chargeId = newId();
    const mc = {
      id: chargeId,
      customerId: cust.id,
      periodMonth: period,
      rateSnapshotBps: cust.monthlyRateBps,
      baseAmountPaise: base,
      chargeAmountPaise: charge,
      status: "applied" as const,
      waivedAmountPaise: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.charges.set(chargeId, mc);
    store.chargeKey.set(key, chargeId);
    // post a debit transaction for the charge (increase outstanding)
    // Charge transaction is a debit that doesn't affect card/account balances specially? We post to system account with zero balance check bypassed? Use postTransaction but need to avoid balance check for system.
    // Instead insert directly and not adjust dummy balances to avoid insufficient funds.
    const txId = newId();
    const tx = {
      id: txId,
      direction: "debit" as const,
      amountPaise: charge,
      customerId: cust.id,
      sourceType: "account" as const,
      sourceId: dummyAccountId,
      occurredAt: now.toISOString(),
      note: `Monthly charge ${period} @ ${(cust.monthlyRateBps/100).toFixed(2)}%`,
      createdBy: opts.actorId,
      reversedFromId: null,
      monthlyChargeId: chargeId,
      createdAt: nowIso(),
    };
    store.transactions.set(txId, tx);
    writeAudit({ actorId: opts.actorId, action: "charge.post", entityType: "monthly_charge", entityId: chargeId, before: null, after: mc });
    writeAudit({ actorId: opts.actorId, action: "transaction.create", entityType: "transaction", entityId: txId, before: null, after: tx });
    created++;
  }
  return { created, skipped };
}

export function waiveOrReduceCharge(params: { chargeId: string; amountPaise?: number; actorId: string|null; dummySourceId?: string }): { charge: typeof store.charges extends Map<string, infer V> ? V : never } {
  const mc = store.charges.get(params.chargeId);
  if (!mc) throw Object.assign(new Error("charge not found"), { statusCode: 404 });
  if (mc.status === "waived") throw Object.assign(new Error("already waived"), { statusCode: 400 });
  const waiveAmt = params.amountPaise ?? mc.chargeAmountPaise;
  if (waiveAmt <= 0 || waiveAmt > mc.chargeAmountPaise) throw Object.assign(new Error("invalid waive amount"), { statusCode: 400 });
  if (mc.waivedAmountPaise + waiveAmt > mc.chargeAmountPaise) throw Object.assign(new Error("exceeds charge"), { statusCode: 400 });
  if (mc.status === "reduced" && mc.waivedAmountPaise + waiveAmt > mc.chargeAmountPaise) throw Object.assign(new Error("exceeds charge"), { statusCode: 400 });

  // find dummy source
  let dummyAccountId = params.dummySourceId ?? null;
  if (!dummyAccountId) {
    for (const a of store.accounts.values()) if (a.name === "_system_charges") { dummyAccountId = a.id; break; }
    if (!dummyAccountId) for (const a of store.accounts.values()) if (a.status==="active") { dummyAccountId=a.id; break; }
    if (!dummyAccountId) {
      const id=newId(); store.accounts.set(id,{id,name:"_system_charges",type:"savings",openingBalancePaise:0,currentBalancePaise:0,status:"active",createdAt:nowIso(),updatedAt:nowIso()}); dummyAccountId=id;
    }
  }

  const before = { ...mc };
  mc.waivedAmountPaise += waiveAmt;
  if (mc.waivedAmountPaise >= mc.chargeAmountPaise) mc.status = "waived";
  else mc.status = "reduced";
  mc.updatedAt = nowIso();

  // post reversing credit transaction
  const txId = newId();
  const tx = {
    id: txId,
    direction: "credit" as const,
    amountPaise: waiveAmt,
    customerId: mc.customerId,
    sourceType: "account" as const,
    sourceId: dummyAccountId!,
    occurredAt: new Date().toISOString(),
    note: `Waiver for ${mc.periodMonth}`,
    createdBy: params.actorId,
    reversedFromId: null,
    monthlyChargeId: mc.id,
    createdAt: nowIso(),
  };
  store.transactions.set(txId, tx);
  writeAudit({ actorId: params.actorId, action: "charge.waive", entityType: "monthly_charge", entityId: mc.id, before, after: { ...mc } });
  writeAudit({ actorId: params.actorId, action: "transaction.create", entityType: "transaction", entityId: txId, before: null, after: tx });
  return { charge: mc as never };
}
