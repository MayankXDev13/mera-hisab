import type { Request, Response } from "express";
import { getRepo } from "../lib/repo.js";

export async function getDashboard(_req: Request, res: Response) {
  const repo = getRepo();
  const [txs, accountsAll, cardsAll, customersAll] = await Promise.all([
    repo.transactions.list({}),
    repo.accounts.list(),
    repo.cards.list(),
    repo.customers.list(),
  ]);

  let totalDisbursed = 0, totalReceived = 0, totalCharges = 0, totalWaived = 0;
  for (const tx of txs) {
    if (tx.monthlyChargeId) {
      if (tx.direction === "debit") totalCharges += tx.amountPaise;
      else totalWaived += tx.amountPaise;
    } else {
      if (tx.direction === "debit") totalDisbursed += tx.amountPaise;
      else totalReceived += tx.amountPaise;
    }
  }
  let outstanding = 0;
  for (const tx of txs) {
    if (tx.direction === "debit") outstanding += tx.amountPaise;
    else outstanding -= tx.amountPaise;
  }

  const accounts = accountsAll.filter((a) => a.status === "active");
  const cards = cardsAll.filter((c) => c.status === "active").map((c) => ({ ...c, availablePaise: c.totalLimitPaise - c.usedPaise }));

  const customers = await Promise.all(
    customersAll
      .filter((c) => c.status === "active")
      .map(async (c) => {
        let out = 0;
        for (const tx of txs) {
          if (tx.customerId !== c.id) continue;
          if (tx.direction === "debit") out += tx.amountPaise;
          else out -= tx.amountPaise;
        }
        return { id: c.id, name: c.name, username: c.username, outstandingPaise: out };
      }),
  );
  customers.sort((a, b) => b.outstandingPaise - a.outstandingPaise);

  res.json({ totals: { totalDisbursed, totalReceived, totalCharges, totalWaived, outstanding }, accounts, cards, customers });
}
