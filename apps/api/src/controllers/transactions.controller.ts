import { z } from "zod";
import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { createLedger, systemClock, randomIdGen, LedgerError } from "../lib/ledger.js";

const createSchema = z.object({
  direction: z.enum(["debit", "credit"]),
  customerId: z.string().uuid(),
  sourceType: z.enum(["account", "credit_card"]),
  sourceId: z.string().uuid(),
  amountPaise: z.number().int().positive().optional(),
  amountRupees: z.union([z.string(), z.number()]).optional(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(2000).nullable().optional(),
});

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listTransactions(req: Request, res: Response) {
  const repo = getRepo();
  const { customerId, sourceType, sourceId, direction, from, to } = req.query as Record<string, string | undefined>;
  res.json(await repo.transactions.list({ customerId, sourceType, sourceId, direction, from, to }));
}

export async function createTransaction(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.amountPaise === undefined && parsed.data.amountRupees === undefined) {
    return res.status(400).json({ error: "amountPaise or amountRupees is required" });
  }
  const repo = getRepo();
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen });
  try {
    const tx = await ledger.post(
      {
        direction: parsed.data.direction,
        customerId: parsed.data.customerId,
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId,
        amountPaise: parsed.data.amountPaise,
        amountRupees: parsed.data.amountRupees,
        occurredAt: parsed.data.occurredAt,
        note: parsed.data.note ?? null,
      },
      { actorId: actor(req) },
    );
    res.status(201).json(tx);
  } catch (e: unknown) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    throw e;
  }
}

export async function reverseTransaction(req: Request, res: Response) {
  const repo = getRepo();
  const orig = await repo.transactions.get(String((req.params as Record<string,string>).id));
  if (!orig) return res.status(404).json({ error: "not found" });
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen });
  try {
    const tx = await ledger.reverse(orig.id, { actorId: actor(req) });
    res.status(201).json(tx);
  } catch (e: unknown) {
    if (e instanceof LedgerError) return res.status(e.statusCode).json({ error: e.message });
    throw e;
  }
}
