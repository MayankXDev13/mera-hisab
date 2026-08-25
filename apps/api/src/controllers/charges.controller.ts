import { z } from "zod";
import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";
import { createLedger, systemClock, randomIdGen } from "../lib/ledger.js";
import { createChargeEngine } from "../lib/charges.js";

const waiveSchema = z.object({ amountPaise: z.number().int().positive().optional() });

function actor(req: Request): string | null {
  return (req as unknown as { user?: { id: string } }).user?.id ?? null;
}

export async function listCharges(req: Request, res: Response) {
  const repo = getRepo();
  const { customerId, periodMonth } = req.query as Record<string, string | undefined>;
  res.json(await repo.charges.list({ customerId, periodMonth }));
}

export async function runCharges(req: Request, res: Response) {
  const actorId = actor(req);
  const nowStr = (req.body as { now?: string })?.now;
  const now = nowStr ? new Date(nowStr) : undefined;
  const repo = getRepo();
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen, allowSystemOverdraw: true });
  const engine = createChargeEngine({ repo, ledger, clock: systemClock, ids: randomIdGen });
  try {
    const result = now
      ? await engine.run(
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          { actorId, now },
        )
      : await engine.runCurrentMonth({ actorId, now });
    res.json(result);
  } catch (e: unknown) {
    const err = e as { message?: string; statusCode?: number };
    res.status(err.statusCode ?? 500).json({ error: err.message ?? "internal" });
  }
}

export async function waiveCharge(req: Request, res: Response) {
  const parsed = waiveSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const repo = getRepo();
  const ledger = createLedger({ repo, clock: systemClock, ids: randomIdGen, allowSystemOverdraw: true });
  const engine = createChargeEngine({ repo, ledger, clock: systemClock, ids: randomIdGen });
  try {
    const r = await engine.waive(String((req.params as Record<string,string>).id), parsed.data.amountPaise ?? null, { actorId: actor(req) });
    res.json(r.charge);
  } catch (e: unknown) {
    const err = e as { message?: string; statusCode?: number };
    res.status(err.statusCode ?? 400).json({ error: err?.message ?? "error" });
  }
}
