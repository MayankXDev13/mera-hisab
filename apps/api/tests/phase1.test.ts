import { describe, it, expect } from "vitest";
import { createMemoryRepo, RepoError } from "@repo/db";
import { createLedger } from "../src/lib/ledger.js";
import { rupeesToPaise } from "@repo/shared";

function makeFixed(prefix: string) {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}
const clock = { now: () => new Date("2026-03-15T10:00:00.000Z") };

describe("repo memory adapter", () => {
  it("rejects duplicate username 409", async () => {
    const repo = createMemoryRepo();
    await repo.customers.create({
      id: "c1",
      name: "A",
      username: "john",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 250,
      status: "active",
    });
    await expect(
      repo.customers.create({
        id: "c2",
        name: "B",
        username: "john",
        email: null,
        phone: null,
        notes: null,
        monthlyRateBps: 250,
        status: "active",
      }),
    ).rejects.toBeInstanceOf(RepoError);
    try {
      await repo.customers.create({
        id: "c3",
        name: "C",
        username: "John",
        email: null,
        phone: null,
        notes: null,
        monthlyRateBps: 250,
        status: "active",
      });
    } catch (e) {
      expect((e as RepoError).statusCode).toBe(409);
    }
  });

  it("rejects duplicate charge period 409", async () => {
    const repo = createMemoryRepo();
    await repo.customers.create({
      id: "cust1",
      name: "X",
      username: "x1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 200,
      status: "active",
    });
    await repo.charges.create({
      id: "ch1",
      customerId: "cust1",
      periodMonth: "2026-03",
      rateSnapshotBps: 200,
      baseAmountPaise: 10000,
      chargeAmountPaise: 200,
      status: "applied",
      waivedAmountPaise: 0,
    });
    await expect(
      repo.charges.create({
        id: "ch2",
        customerId: "cust1",
        periodMonth: "2026-03",
        rateSnapshotBps: 200,
        baseAmountPaise: 10000,
        chargeAmountPaise: 200,
        status: "applied",
        waivedAmountPaise: 0,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rolls back withTransaction on throw", async () => {
    const repo = createMemoryRepo();
    await repo.accounts.create({
      id: "a1",
      name: "Main",
      type: "savings",
      openingBalancePaise: 10000,
      currentBalancePaise: 10000,
      status: "active",
    });
    try {
      await repo.withTransaction(async (tx) => {
        await tx.accounts.update("a1", { currentBalancePaise: 9999 });
        throw new Error("boom");
      });
    } catch {}
    const acc = await repo.accounts.get("a1");
    expect(acc?.currentBalancePaise).toBe(10000);
  });
});

describe("ledger single write path", () => {
  it("debit reduces account, credit increases, over-limit fails with 0 writes", async () => {
    const repo = createMemoryRepo();
    const ledger = createLedger({ repo, clock, ids: makeFixed("tx") });
    await repo.accounts.create({
      id: "a1",
      name: "Main",
      type: "savings",
      openingBalancePaise: 10000,
      currentBalancePaise: 10000,
      status: "active",
    });
    await repo.customers.create({
      id: "cust1",
      name: "Cust",
      username: "cust1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
    });

    const tx1 = await ledger.post(
      { direction: "debit", customerId: "cust1", sourceType: "account", sourceId: "a1", amountPaise: 3000 },
      { actorId: "user1" },
    );
    expect(tx1.amountPaise).toBe(3000);
    expect((await repo.accounts.get("a1"))?.currentBalancePaise).toBe(7000);
    expect((await repo.transactions.list({})).length).toBe(1);
    expect((await repo.audit.list({})).length).toBe(1);

    // over-limit
    await expect(
      ledger.post({ direction: "debit", customerId: "cust1", sourceType: "account", sourceId: "a1", amountPaise: 8000 }, { actorId: "user1" }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect((await repo.accounts.get("a1"))?.currentBalancePaise).toBe(7000);
    expect((await repo.transactions.list({})).length).toBe(1);
    expect((await repo.audit.list({})).length).toBe(1);

    // credit
    const tx2 = await ledger.post(
      { direction: "credit", customerId: "cust1", sourceType: "account", sourceId: "a1", amountPaise: 1000 },
      { actorId: "user1" },
    );
    expect(tx2.direction).toBe("credit");
    expect((await repo.accounts.get("a1"))?.currentBalancePaise).toBe(8000);
  });

  it("card debit checks limit, credit clamps to 0", async () => {
    const repo = createMemoryRepo();
    const ledger = createLedger({ repo, clock, ids: makeFixed("tx2") });
    await repo.cards.create({
      id: "card1",
      issuer: "HDFC",
      last4: "1234",
      totalLimitPaise: 50000,
      usedPaise: 40000,
      status: "active",
    });
    await repo.customers.create({
      id: "cust1",
      name: "Cust",
      username: "cust1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
    });

    await expect(
      ledger.post({ direction: "debit", customerId: "cust1", sourceType: "credit_card", sourceId: "card1", amountPaise: 20000 }, { actorId: "u1" }),
    ).rejects.toMatchObject({ statusCode: 400 });

    // credit that would go negative clamps
    const tx = await ledger.post(
      { direction: "credit", customerId: "cust1", sourceType: "credit_card", sourceId: "card1", amountPaise: 50000 },
      { actorId: "u1" },
    );
    expect(tx.direction).toBe("credit");
    expect((await repo.cards.get("card1"))?.usedPaise).toBe(0);
  });

  it("accepts amountRupees string and converts via rupeesToPaise", async () => {
    const repo = createMemoryRepo();
    const ledger = createLedger({ repo, clock, ids: makeFixed("tx3") });
    await repo.accounts.create({
      id: "a1",
      name: "Main",
      type: "savings",
      openingBalancePaise: 10000,
      currentBalancePaise: 10000,
      status: "active",
    });
    await repo.customers.create({
      id: "cust1",
      name: "Cust",
      username: "cust1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
    });

    expect(rupeesToPaise("12.50")).toBe(1250);
    const tx = await ledger.post(
      { direction: "debit", customerId: "cust1", sourceType: "account", sourceId: "a1", amountRupees: "12.50" },
      { actorId: "u1" },
    );
    expect(tx.amountPaise).toBe(1250);
    expect((await repo.accounts.get("a1"))?.currentBalancePaise).toBe(8750);
  });

  it("reverse creates linked credit and audit", async () => {
    const repo = createMemoryRepo();
    const ledger = createLedger({ repo, clock, ids: makeFixed("tx4") });
    await repo.accounts.create({
      id: "a1",
      name: "Main",
      type: "savings",
      openingBalancePaise: 10000,
      currentBalancePaise: 10000,
      status: "active",
    });
    await repo.customers.create({
      id: "cust1",
      name: "Cust",
      username: "cust1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
    });

    const orig = await ledger.post(
      { direction: "debit", customerId: "cust1", sourceType: "account", sourceId: "a1", amountPaise: 1000 },
      { actorId: "u1", id: "orig1" },
    );
    expect((await repo.accounts.get("a1"))?.currentBalancePaise).toBe(9000);
    const rev = await ledger.reverse(orig.id, { actorId: "u1", id: "rev1" });
    expect(rev.reversedFromId).toBe(orig.id);
    expect(rev.direction).toBe("credit");
    expect((await repo.accounts.get("a1"))?.currentBalancePaise).toBe(10000);
    const audits = await repo.audit.list({ action: "transaction.reverse" });
    expect(audits.length).toBe(1);
  });

  it("null actorId writes audit without throw", async () => {
    const repo = createMemoryRepo();
    const ledger = createLedger({ repo, clock, ids: makeFixed("tx5"), allowSystemOverdraw: true });
    await repo.accounts.create({
      id: "a1",
      name: "_system_charges",
      type: "savings",
      openingBalancePaise: 0,
      currentBalancePaise: 0,
      status: "active",
    });
    await repo.customers.create({
      id: "cust1",
      name: "Cust",
      username: "cust1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
    });

    const tx = await ledger.post(
      { direction: "debit", customerId: "cust1", sourceType: "account", sourceId: "a1", amountPaise: 100 },
      { actorId: null },
    );
    expect(tx.createdBy).toBeNull();
    const audits = await repo.audit.list({});
    expect(audits[0]?.actorId).toBeNull();
  });
});
