import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { createLedger, systemClock, randomIdGen, LedgerError } from "../lib/ledger.js";
import { toTransactionDto } from "../lib/dto.js";

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listTransactions(req: Request, res: Response) {
  const repo = getRepo();
  const q = (req.validated?.query as Record<string, string | undefined> | undefined) ?? (req.query as Record<string, string | undefined>);
  const list = await repo.transactions.list({
    customerId: q.customerId,
    sourceType: q.sourceType,
    sourceId: q.sourceId,
    direction: q.direction,
    from: q.from,
    to: q.to,
  });
  // pagination is validated but list is not yet paginated at repo level; slice here
  const page = Number((q as Record<string, unknown>).page ?? 1);
  const limit = Number((q as Record<string, unknown>).limit ?? 20);
  const start = (Math.max(1, page) - 1) * Math.max(1, Math.min(100, limit));
  const end = start + Math.max(1, Math.min(100, limit));
  res.json(list.slice(start, end).map(toTransactionDto));
}

export async function createTransaction(req: Request, res: Response) {
  const body = req.body as {
    direction: "debit" | "credit";
    customerId: string;
    sourceType: "account" | "credit_card";
    sourceId: string;
    amountPaise?: number;
    amountRupees?: string | number;
    occurredAt?: string;
    note?: string | null;
  };
  const repo = getRepo();
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen });
  try {
    const tx = await ledger.post(
      {
        direction: body.direction,
        customerId: body.customerId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        amountPaise: body.amountPaise,
        amountRupees: body.amountRupees,
        occurredAt: body.occurredAt,
        note: body.note ?? null,
      },
      { actorId: actor(req) },
    );
    res.status(201).json(toTransactionDto(tx));
  } catch (e: unknown) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    throw e;
  }
}

export async function reverseTransaction(req: Request, res: Response) {
  const repo = getRepo();
  const orig = await repo.transactions.get(String((req.params as Record<string, string>).id));
  if (!orig) return res.status(404).json({ error: "not found" });
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen });
  try {
    const tx = await ledger.reverse(orig.id, { actorId: actor(req) });
    res.status(201).json(toTransactionDto(tx));
  } catch (e: unknown) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    throw e;
  }
}
