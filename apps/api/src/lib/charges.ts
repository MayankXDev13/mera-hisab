import { RepoError } from "@repo/db";
import type { LedgerRepo, MonthlyCharge, Transaction } from "@repo/db";
import type { Clock, IdGenerator, Ledger } from "./ledger.js";
import { createLedger, randomIdGen, systemClock } from "./ledger.js";
import { getRepo } from "./repo.js";

export function periodForDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function chargeAmountPaise(base: number, rateBps: number): number {
  return Math.round((base * rateBps) / 10000);
}

export class ChargeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ChargeError";
  }
}

async function computeOutstanding(repo: LedgerRepo, customerId: string): Promise<number> {
  const list = await repo.transactions.list({ customerId });
  let out = 0;
  for (const t of list) {
    if (t.direction === "debit") out += t.amountPaise;
    else out -= t.amountPaise;
  }
  return out;
}

async function ensureSystemAccount(
  repo: LedgerRepo,
  ids: IdGenerator,
  clock: Clock,
  preferredId?: string,
): Promise<string> {
  if (preferredId) {
    const acc = await repo.accounts.get(preferredId);
    if (acc) return acc.id;
    const now = clock.now().toISOString();
    const created = await repo.accounts.create({
      id: preferredId,
      name: "_system_charges",
      type: "savings",
      openingBalancePaise: 0,
      currentBalancePaise: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return created.id;
  }
  const accounts = await repo.accounts.list();
  const found = accounts.find((a) => a.name === "_system_charges");
  if (found) return found.id;
  const id = ids.next();
  const now = clock.now().toISOString();
  const created = await repo.accounts.create({
    id,
    name: "_system_charges",
    type: "savings",
    openingBalancePaise: 0,
    currentBalancePaise: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return created.id;
}

export type ChargeEngine = {
  run(period: string, ctx: { actorId: string | null; now?: Date }): Promise<{ created: number; skipped: number }>;
  runCurrentMonth(ctx: { actorId: string | null; now?: Date }): Promise<{ created: number; skipped: number }>;
  waive(
    chargeId: string,
    amountPaise: number | null,
    ctx: { actorId: string | null; now?: Date; id?: string },
  ): Promise<{ charge: MonthlyCharge; waiveTx: Transaction }>;
};

export function createChargeEngine(deps: {
  repo: LedgerRepo;
  ledger: Ledger;
  clock: Clock;
  ids: IdGenerator;
  systemAccountId?: string;
}): ChargeEngine {
  const { repo, ledger, clock, ids, systemAccountId } = deps;

  async function run(period: string, ctx: { actorId: string | null; now?: Date }): Promise<{ created: number; skipped: number }> {
    const now = ctx.now ?? clock.now();
    const actorId = ctx.actorId;
    const systemId = await ensureSystemAccount(repo, ids, clock, systemAccountId);
    const customers = await repo.customers.list();
    let created = 0;
    let skipped = 0;

    for (const cust of customers) {
      if (cust.status !== "active") {
        skipped++;
        continue;
      }

      const existing = await repo.charges.list({ customerId: cust.id, periodMonth: period });
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const outstanding = await computeOutstanding(repo, cust.id);
      if (outstanding <= 0) {
        skipped++;
        continue;
      }
      const base = outstanding;
      const charge = chargeAmountPaise(base, cust.monthlyRateBps);
      if (charge <= 0) {
        skipped++;
        continue;
      }

      const chargeId = ids.next();
      const mc: MonthlyCharge = {
        id: chargeId,
        customerId: cust.id,
        periodMonth: period,
        rateSnapshotBps: cust.monthlyRateBps,
        baseAmountPaise: base,
        chargeAmountPaise: charge,
        status: "applied",
        waivedAmountPaise: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      try {
        await repo.charges.create(mc);
      } catch (e: unknown) {
        if (e instanceof RepoError && e.statusCode === 409) {
          skipped++;
          continue;
        }
        throw e;
      }

      await repo.audit.write({
        actorId,
        action: "charge.post",
        entityType: "monthly_charge",
        entityId: chargeId,
        before: null,
        after: JSON.stringify(mc),
      });

      const txId = ids.next();
      try {
        await ledger.post(
          {
            direction: "debit",
            customerId: cust.id,
            sourceType: "account",
            sourceId: systemId,
            amountPaise: charge,
            occurredAt: now.toISOString(),
            note: `Monthly charge ${period} @ ${(cust.monthlyRateBps / 100).toFixed(2)}%`,
            monthlyChargeId: chargeId,
          },
          { actorId, now, id: txId },
        );
      } catch (e: unknown) {
        // ledger already rolled back its own tx; charge remains but that's the idempotent key.
        // rethrow as charge error so caller sees; the charge is already recorded.
        throw e;
      }

      created++;
    }

    return { created, skipped };
  }

  async function runCurrentMonth(ctx: { actorId: string | null; now?: Date }): Promise<{ created: number; skipped: number }> {
    const now = ctx.now ?? clock.now();
    const period = periodForDate(now);
    return run(period, { actorId: ctx.actorId, now });
  }

  async function waive(
    chargeId: string,
    amountPaise: number | null,
    ctx: { actorId: string | null; now?: Date; id?: string },
  ): Promise<{ charge: MonthlyCharge; waiveTx: Transaction }> {
    const mc = await repo.charges.get(chargeId);
    if (!mc) throw new ChargeError("charge not found", 404, "NotFound");
    if (mc.status === "waived") throw new ChargeError("already waived", 400, "AlreadyWaived");

    const remaining = mc.chargeAmountPaise - mc.waivedAmountPaise;
    const waiveAmt = amountPaise ?? remaining;
    if (!Number.isInteger(waiveAmt) || waiveAmt <= 0 || waiveAmt > remaining) {
      throw new ChargeError("invalid waive amount", 400, "InvalidAmount");
    }
    if (mc.waivedAmountPaise + waiveAmt > mc.chargeAmountPaise) {
      throw new ChargeError("exceeds charge", 400, "InvalidAmount");
    }

    const systemId = await ensureSystemAccount(repo, ids, clock, systemAccountId);
    const before = { ...mc };
    const newWaived = mc.waivedAmountPaise + waiveAmt;
    const newStatus: MonthlyCharge["status"] = newWaived >= mc.chargeAmountPaise ? "waived" : "reduced";

    const updated = await repo.charges.update(chargeId, {
      waivedAmountPaise: newWaived,
      status: newStatus,
    });

    const now = ctx.now ?? clock.now();
    const waiveTx = await ledger.post(
      {
        direction: "credit",
        customerId: mc.customerId,
        sourceType: "account",
        sourceId: systemId,
        amountPaise: waiveAmt,
        occurredAt: now.toISOString(),
        note: `Waiver for ${mc.periodMonth}`,
        monthlyChargeId: chargeId,
      },
      { actorId: ctx.actorId, now, id: ctx.id ?? ids.next() },
    );

    await repo.audit.write({
      actorId: ctx.actorId,
      action: "charge.waive",
      entityType: "monthly_charge",
      entityId: chargeId,
      before: JSON.stringify(before),
      after: JSON.stringify(updated),
    });

    return { charge: updated, waiveTx };
  }

  return { run, runCurrentMonth, waive };
}

// ---------------------------------------------------------------------------
// Back-compat wrappers used by routes/index until they migrate to DI
// ---------------------------------------------------------------------------
export async function runMonthlyCharges(opts: {
  now?: Date;
  actorId: string | null;
  dummySourceId?: string;
}): Promise<{ created: number; skipped: number }> {
  const repo = getRepo();
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen, allowSystemOverdraw: true });
  const engine = createChargeEngine({
    repo,
    ledger,
    clock: systemClock,
    ids: randomIdGen,
    systemAccountId: opts.dummySourceId,
  });
  if (opts.now) {
    const period = periodForDate(opts.now);
    return engine.run(period, { actorId: opts.actorId, now: opts.now });
  }
  return engine.runCurrentMonth({ actorId: opts.actorId, now: opts.now });
}

export async function waiveOrReduceCharge(params: {
  chargeId: string;
  amountPaise?: number;
  actorId: string | null;
  dummySourceId?: string;
}): Promise<{ charge: MonthlyCharge }> {
  const repo = getRepo();
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen, allowSystemOverdraw: true });
  const engine = createChargeEngine({
    repo,
    ledger,
    clock: systemClock,
    ids: randomIdGen,
    systemAccountId: params.dummySourceId,
  });
  const r = await engine.waive(params.chargeId, params.amountPaise ?? null, { actorId: params.actorId });
  return { charge: r.charge };
}
