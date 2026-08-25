import { randomUUID } from "node:crypto";
import { rupeesToPaise } from "@repo/shared";
import type { LedgerRepo, Transaction } from "@repo/db";
import { RepoError } from "@repo/db";

export type Clock = { now(): Date };
export type IdGenerator = { next(): string };

export const systemClock: Clock = { now: () => new Date() };
export const randomIdGen: IdGenerator = { next: () => randomUUID() };

export class LedgerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LedgerError";
  }
}

export type PostInput = {
  direction: "debit" | "credit";
  customerId: string;
  sourceType: "account" | "credit_card";
  sourceId: string;
  amountPaise?: number;
  amountRupees?: string | number;
  occurredAt?: string;
  note?: string | null;
  monthlyChargeId?: string | null;
};

export type Ctx = { actorId: string | null; now?: Date; id?: string };

export type Ledger = {
  post(input: PostInput, ctx: Ctx): Promise<Transaction>;
  reverse(transactionId: string, ctx: Ctx): Promise<Transaction>;
};

function resolveAmount(input: PostInput): number {
  if (input.amountPaise !== undefined && input.amountRupees !== undefined) {
    throw new LedgerError("provide amountPaise or amountRupees, not both", 400, "InvalidAmount");
  }
  if (input.amountPaise !== undefined) {
    if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw new LedgerError("amount must be > 0", 400, "InvalidAmount");
    }
    return input.amountPaise;
  }
  if (input.amountRupees !== undefined) {
    const paise = rupeesToPaise(input.amountRupees);
    if (!Number.isInteger(paise) || paise <= 0) {
      throw new LedgerError("amount must be > 0", 400, "InvalidAmount");
    }
    return paise;
  }
  throw new LedgerError("amountPaise or amountRupees is required", 400, "InvalidAmount");
}

export function createLedger(deps: { repo: LedgerRepo; clock: Clock; ids: IdGenerator; allowSystemOverdraw?: boolean }): Ledger {
  const { repo, clock, ids } = deps;

  async function post(input: PostInput, ctx: Ctx): Promise<Transaction> {
    const amountPaise = resolveAmount(input);
    const occurredAt = input.occurredAt ?? (ctx.now ?? clock.now()).toISOString();
    const id = ctx.id ?? ids.next();
    const actorId = ctx.actorId;

    // validate customer exists outside tx for fast fail (also inside tx for FK safety)
    const customer = await repo.customers.get(input.customerId);
    if (!customer) throw new LedgerError("customer not found", 404, "NotFound");

    return repo.withTransaction(async (txRepo) => {
      if (input.sourceType === "account") {
        const acc = await txRepo.accounts.get(input.sourceId);
        if (!acc) throw new LedgerError("account not found", 404, "NotFound");

        const isSystem = acc.name === "_system_charges";
        if (input.direction === "debit") {
          if (!isSystem || !deps.allowSystemOverdraw) {
            if (acc.currentBalancePaise < amountPaise) {
              throw new LedgerError("insufficient account balance", 400, "InsufficientFunds");
            }
          }
          const nextBalance = acc.currentBalancePaise - amountPaise;
          // for system with overdraw we allow negative? keep as is but don't go below if not allowed
          await txRepo.accounts.update(acc.id, { currentBalancePaise: nextBalance });
        } else {
          const nextBalance = acc.currentBalancePaise + amountPaise;
          await txRepo.accounts.update(acc.id, { currentBalancePaise: nextBalance });
        }

        const tx: Transaction = {
          id,
          direction: input.direction,
          amountPaise,
          customerId: input.customerId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          occurredAt,
          note: input.note ?? null,
          createdBy: actorId,
          reversedFromId: null,
          monthlyChargeId: input.monthlyChargeId ?? null,
          createdAt: (ctx.now ?? clock.now()).toISOString(),
        };

        const created = await txRepo.transactions.create(tx);
        await txRepo.audit.write({
          actorId,
          action: "transaction.create",
          entityType: "transaction",
          entityId: created.id,
          before: null,
          after: JSON.stringify(created),
        });
        return created;
      } else {
        const card = await txRepo.cards.get(input.sourceId);
        if (!card) throw new LedgerError("card not found", 404, "NotFound");

        if (input.direction === "debit") {
          const available = card.totalLimitPaise - card.usedPaise;
          if (available < amountPaise) {
            throw new LedgerError("insufficient card limit", 400, "InsufficientFunds");
          }
          await txRepo.cards.update(card.id, { usedPaise: card.usedPaise + amountPaise });
        } else {
          const nextUsed = Math.max(0, card.usedPaise - amountPaise);
          await txRepo.cards.update(card.id, { usedPaise: nextUsed });
        }

        const tx: Transaction = {
          id,
          direction: input.direction,
          amountPaise,
          customerId: input.customerId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          occurredAt,
          note: input.note ?? null,
          createdBy: actorId,
          reversedFromId: null,
          monthlyChargeId: input.monthlyChargeId ?? null,
          createdAt: (ctx.now ?? clock.now()).toISOString(),
        };

        const created = await txRepo.transactions.create(tx);
        await txRepo.audit.write({
          actorId,
          action: "transaction.create",
          entityType: "transaction",
          entityId: created.id,
          before: null,
          after: JSON.stringify(created),
        });
        return created;
      }
    });
  }

  async function reverse(transactionId: string, ctx: Ctx): Promise<Transaction> {
    const orig = await repo.transactions.get(transactionId);
    if (!orig) throw new LedgerError("not found", 404, "NotFound");

    const revDir = orig.direction === "debit" ? "credit" : "debit";
    const id = ctx.id ?? ids.next();
    const actorId = ctx.actorId;

    return repo.withTransaction(async (txRepo) => {
      // re-validate orig inside tx snapshot
      const freshOrig = await txRepo.transactions.get(transactionId);
      if (!freshOrig) throw new LedgerError("not found", 404, "NotFound");

      if (freshOrig.sourceType === "account") {
        const acc = await txRepo.accounts.get(freshOrig.sourceId);
        if (!acc) throw new LedgerError("account not found", 404, "NotFound");
        if (revDir === "debit") {
          const isSystem = acc.name === "_system_charges";
          if (!isSystem || !deps.allowSystemOverdraw) {
            if (acc.currentBalancePaise < freshOrig.amountPaise) {
              throw new LedgerError("insufficient account balance", 400, "InsufficientFunds");
            }
          }
          await txRepo.accounts.update(acc.id, { currentBalancePaise: acc.currentBalancePaise - freshOrig.amountPaise });
        } else {
          await txRepo.accounts.update(acc.id, { currentBalancePaise: acc.currentBalancePaise + freshOrig.amountPaise });
        }
      } else {
        const card = await txRepo.cards.get(freshOrig.sourceId);
        if (!card) throw new LedgerError("card not found", 404, "NotFound");
        if (revDir === "debit") {
          const available = card.totalLimitPaise - card.usedPaise;
          if (available < freshOrig.amountPaise) {
            throw new LedgerError("insufficient card limit", 400, "InsufficientFunds");
          }
          await txRepo.cards.update(card.id, { usedPaise: card.usedPaise + freshOrig.amountPaise });
        } else {
          await txRepo.cards.update(card.id, { usedPaise: Math.max(0, card.usedPaise - freshOrig.amountPaise) });
        }
      }

      const tx: Transaction = {
        id,
        direction: revDir,
        amountPaise: freshOrig.amountPaise,
        customerId: freshOrig.customerId,
        sourceType: freshOrig.sourceType,
        sourceId: freshOrig.sourceId,
        occurredAt: (ctx.now ?? clock.now()).toISOString(),
        note: `Reversal of ${freshOrig.id}`,
        createdBy: actorId,
        reversedFromId: freshOrig.id,
        monthlyChargeId: null,
        createdAt: (ctx.now ?? clock.now()).toISOString(),
      };

      const created = await txRepo.transactions.create(tx);
      await txRepo.audit.write({
        actorId,
        action: "transaction.reverse",
        entityType: "transaction",
        entityId: created.id,
        before: JSON.stringify(freshOrig),
        after: JSON.stringify(created),
      });
      return created;
    });
  }

  return { post, reverse };
}

// keep computeOutstanding for backward compat but prefer repo aggregate
export async function computeOutstanding(repo: LedgerRepo, customerId: string): Promise<number> {
  const list = await repo.transactions.list({ customerId });
  let out = 0;
  for (const tx of list) {
    if (tx.direction === "debit") out += tx.amountPaise;
    else out -= tx.amountPaise;
  }
  return out;
}
