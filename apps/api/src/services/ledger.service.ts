import { randomUUID } from "node:crypto";
import { and, eq } from "@repo/db";
import { db as prodDb } from "@repo/db";
import {
  auditLogs,
  customers,
  fundingSources,
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
  sourceId: string;
  amountPaise?: number;
  amountRupees?: string | number;
  occurredAt?: string | Date;
  note?: string | null;
};

async function assertCustomerExists(
  db: DbClient,
  userId: string,
  customerId: string,
) {
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new LedgerError("customer not found", 404);
}

async function loadSource(tx: DbClient, userId: string, sourceId: string) {
  const rows = await tx
    .select()
    .from(fundingSources)
    .where(
      and(eq(fundingSources.id, sourceId), eq(fundingSources.userId, userId)),
    )
    .limit(1);
  if (!rows[0]) throw new LedgerError("funding source not found", 404);
  const src = rows[0];
  if (src.status !== "active")
    throw new LedgerError("funding source is deactivated", 400);
  return src;
}

/** One place for the money math. Branches on kind, not on two tables. */
async function applySourceDelta(
  tx: DbClient,
  src: typeof fundingSources.$inferSelect,
  direction: "debit" | "credit",
  amountPaise: number,
) {
  if (src.kind === "bank_account") {
    if (direction === "debit") {
      const balance = src.currentBalancePaise ?? 0;
      if (balance < amountPaise)
        throw new LedgerError("insufficient account balance", 400);
      await tx
        .update(fundingSources)
        .set({
          currentBalancePaise: balance - amountPaise,
          updatedAt: new Date(),
        })
        .where(eq(fundingSources.id, src.id));
    } else {
      await tx
        .update(fundingSources)
        .set({
          currentBalancePaise: (src.currentBalancePaise ?? 0) + amountPaise,
          updatedAt: new Date(),
        })
        .where(eq(fundingSources.id, src.id));
    }
  } else {
    if (direction === "debit") {
      const available = (src.totalLimitPaise ?? 0) - (src.usedPaise ?? 0);
      if (available < amountPaise)
        throw new LedgerError("insufficient card limit", 400);
      await tx
        .update(fundingSources)
        .set({
          usedPaise: (src.usedPaise ?? 0) + amountPaise,
          updatedAt: new Date(),
        })
        .where(eq(fundingSources.id, src.id));
    } else {
      const nextUsed = Math.max(0, (src.usedPaise ?? 0) - amountPaise);
      await tx
        .update(fundingSources)
        .set({ usedPaise: nextUsed, updatedAt: new Date() })
        .where(eq(fundingSources.id, src.id));
    }
  }
}

export async function createLedgerTransaction(
  input: CreateInput,
  opts: { db?: DbClient; actorId?: string | null } = {},
): Promise<typeof transactions.$inferSelect> {
  const db = opts.db ?? prodDb;
  // actor is the owner; anonymous ledger writes are not allowed
  const userId = opts.actorId;
  if (!userId) throw new LedgerError("unauthorized", 401);

  if (input.direction === "credit") {
    throw new LedgerError(
      "repayments must be recorded via the repayments endpoint",
      400,
    );
  }

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

  // Note: customer check outside transaction, small TOCTOU window.
  await assertCustomerExists(db, userId, input.customerId);

  const created = await db.transaction(async (tx) => {
    const tdb = tx as unknown as DbClient;

    const src = await loadSource(tdb, userId, input.sourceId);
    await applySourceDelta(tdb, src, input.direction, amountPaise);

    const [row] = await tdb
      .insert(transactions)
      .values({
        id,
        userId,
        direction: input.direction,
        amountPaise,
        customerId: input.customerId,
        sourceId: input.sourceId,
        occurredAt: new Date(occurredAtIso),
        note: input.note ?? null,
        createdBy: userId,
      })
      .returning();
    if (!row) throw new LedgerError("failed to create transaction", 500);

    await tdb.insert(auditLogs).values({
      actorId: userId,
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
