import { randomUUID } from "node:crypto";
import { eq } from "@repo/db";
import { db as prodDb } from "@repo/db";
import {
  accounts,
  auditLogs,
  creditCards,
  customers,
  transactions,
} from "@repo/db/schema";
import { resolveAmount } from "@repo/schemas";

type DbClient = typeof prodDb;

export class LedgerError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "LedgerError";
    this.statusCode = statusCode;
  }
}

type CreateInput = {
  direction: "debit" | "credit";
  customerId: string;
  sourceType: "account" | "credit_card";
  sourceId: string;
  amountPaise?: number;
  amountRupees?: string | number;
  occurredAt?: string | Date;
  note?: string | null;
};

async function assertCustomerExists(db: DbClient, customerId: string) {
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!rows[0]) throw new LedgerError("customer not found", 404);
}

async function loadAccount(tx: DbClient, sourceId: string) {
  const rows = await tx
    .select()
    .from(accounts)
    .where(eq(accounts.id, sourceId))
    .limit(1);
  if (!rows[0]) throw new LedgerError("account not found", 404);
  const acc = rows[0];
  if (acc.status !== "active")
    throw new LedgerError("account is deactivated", 400);
  return acc;
}

async function loadCard(tx: DbClient, sourceId: string) {
  const rows = await tx
    .select()
    .from(creditCards)
    .where(eq(creditCards.id, sourceId))
    .limit(1);
  if (!rows[0]) throw new LedgerError("card not found", 404);
  const card = rows[0];
  if (card.status !== "active")
    throw new LedgerError("card is deactivated", 400);
  return card;
}

async function applyAccountDelta(
  tx: DbClient,
  account: typeof accounts.$inferSelect,
  direction: "debit" | "credit",
  amountPaise: number,
) {
  if (direction === "debit") {
    if (account.currentBalancePaise < amountPaise)
      throw new LedgerError("insufficient account balance", 400);
    await tx
      .update(accounts)
      .set({
        currentBalancePaise: account.currentBalancePaise - amountPaise,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, account.id));
  } else {
    await tx
      .update(accounts)
      .set({
        currentBalancePaise: account.currentBalancePaise + amountPaise,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, account.id));
  }
}

async function applyCardDelta(
  tx: DbClient,
  card: typeof creditCards.$inferSelect,
  direction: "debit" | "credit",
  amountPaise: number,
) {
  if (direction === "debit") {
    const available = card.totalLimitPaise - card.usedPaise;
    if (available < amountPaise)
      throw new LedgerError("insufficient card limit", 400);
    await tx
      .update(creditCards)
      .set({ usedPaise: card.usedPaise + amountPaise, updatedAt: new Date() })
      .where(eq(creditCards.id, card.id));
  } else {
    const nextUsed = Math.max(0, card.usedPaise - amountPaise);
    await tx
      .update(creditCards)
      .set({ usedPaise: nextUsed, updatedAt: new Date() })
      .where(eq(creditCards.id, card.id));
  }
}

export async function createLedgerTransaction(
  input: CreateInput,
  opts: { db?: DbClient; actorId?: string | null } = {},
): Promise<typeof transactions.$inferSelect> {
  const db = opts.db ?? prodDb;
  const actorId = opts.actorId ?? null;

  const amountPaise = resolveAmount(input);
  if (amountPaise === null) {
    throw new LedgerError(
      "amountPaise or amountRupees is required and must be >0, not both",
      400,
    );
  }

  const occurredAtIso = input.occurredAt
    ? new Date(input.occurredAt as string).toISOString()
    : new Date().toISOString();
  const id = randomUUID();

  // Note: customer check outside transaction, small TOCTOU window. If we need strict isolation,
  // move this inside tx with SELECT ... FOR UPDATE or handle not found inside tx.
  await assertCustomerExists(db, input.customerId);

  const created = await db.transaction(async (tx) => {
    const tdb = tx as unknown as DbClient;

    if (input.sourceType === "account") {
      const acc = await loadAccount(tdb, input.sourceId);
      await applyAccountDelta(tdb, acc, input.direction, amountPaise);
    } else {
      const card = await loadCard(tdb, input.sourceId);
      await applyCardDelta(tdb, card, input.direction, amountPaise);
    }

    const [row] = await tdb
      .insert(transactions)
      .values({
        id,
        direction: input.direction,
        amountPaise,
        customerId: input.customerId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        occurredAt: new Date(occurredAtIso),
        note: input.note ?? null,
        createdBy: actorId,
      })
      .returning();
    if (!row) throw new LedgerError("failed to create transaction", 500);

    await tdb.insert(auditLogs).values({
      actorId,
      action: "transaction.create",
      entityType: "transaction",
      entityId: row.id,
      before: null,
      after: row as unknown as never,
    });
    return row;
  });

  return created as typeof transactions.$inferSelect;
}

export async function reverseLedgerTransaction(
  transactionId: string,
  opts: { db?: DbClient; actorId?: string | null } = {},
): Promise<typeof transactions.$inferSelect> {
  const db = opts.db ?? prodDb;
  const actorId = opts.actorId ?? null;
  const newId = randomUUID();

  const origRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);
  if (!origRows[0]) throw new LedgerError("transaction not found", 404);
  const orig = origRows[0];
  const revDir = orig.direction === "debit" ? "credit" : "debit";

  const created = await db.transaction(async (tx) => {
    const tdb = tx as unknown as DbClient;

    const freshRows = await tdb
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);
    if (!freshRows[0]) throw new LedgerError("transaction not found", 404);
    const fresh = freshRows[0];

    if (fresh.sourceType === "account") {
      const acc = await loadAccount(tdb, fresh.sourceId);
      await applyAccountDelta(
        tdb,
        acc,
        revDir as "debit" | "credit",
        fresh.amountPaise,
      );
    } else {
      const card = await loadCard(tdb, fresh.sourceId);
      await applyCardDelta(
        tdb,
        card,
        revDir as "debit" | "credit",
        fresh.amountPaise,
      );
    }

    const [row] = await tdb
      .insert(transactions)
      .values({
        id: newId,
        direction: revDir as "debit" | "credit",
        amountPaise: fresh.amountPaise,
        customerId: fresh.customerId,
        sourceType: fresh.sourceType,
        sourceId: fresh.sourceId,
        occurredAt: new Date(),
        note: `Reversal of ${fresh.id}`,
        createdBy: actorId,
        reversedFromId: fresh.id,
      })
      .returning();
    if (!row) throw new LedgerError("failed to create reversal", 500);

    await tdb.insert(auditLogs).values({
      actorId,
      action: "transaction.reverse",
      entityType: "transaction",
      entityId: row.id,
      before: fresh as unknown as never,
      after: row as unknown as never,
    });
    return row;
  });

  return created as typeof transactions.$inferSelect;
}
