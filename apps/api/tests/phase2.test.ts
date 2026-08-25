import { describe, it, expect } from "vitest";
import { createMemoryRepo } from "@repo/db";
import { createLedger } from "../src/lib/ledger.js";
import { createChargeEngine } from "../src/lib/charges.js";

function ids(prefix = "id") {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}
const clock = { now: () => new Date("2026-03-01T10:00:00.000Z") };

async function setupTwoCustomers() {
  const repo = createMemoryRepo();
  const ledger = createLedger({ repo, clock, ids: ids("tx"), allowSystemOverdraw: true });
  const engine = createChargeEngine({ repo, ledger, clock, ids: ids("ch") });
  // customers
  await repo.customers.create({
    id: "cust-a",
    name: "A",
    username: "a_user",
    email: null,
    phone: null,
    notes: null,
    monthlyRateBps: 500,
    status: "active",
  });
  await repo.customers.create({
    id: "cust-b",
    name: "B",
    username: "b_user",
    email: null,
    phone: null,
    notes: null,
    monthlyRateBps: 200,
    status: "active",
  });
  // need outstanding: post debits via system overdraw ledger
  await ledger.post({ direction: "debit", customerId: "cust-a", sourceType: "account", sourceId: await ensureSystem(repo), amountPaise: 10000 }, { actorId: "admin" });
  await ledger.post({ direction: "debit", customerId: "cust-b", sourceType: "account", sourceId: await ensureSystem(repo), amountPaise: 20000 }, { actorId: "admin" });
  // also an inactive customer should be skipped
  await repo.customers.create({
    id: "cust-inactive",
    name: "Inactive",
    username: "inactive1",
    email: null,
    phone: null,
    notes: null,
    monthlyRateBps: 1000,
    status: "deactivated",
  });
  await ledger.post({ direction: "debit", customerId: "cust-inactive", sourceType: "account", sourceId: await ensureSystem(repo), amountPaise: 50000 }, { actorId: "admin" });
  return { repo, ledger, engine };
}

async function ensureSystem(repo: ReturnType<typeof createMemoryRepo>): Promise<string> {
  const list = await repo.accounts.list();
  const found = list.find((a) => a.name === "_system_charges");
  if (found) return found.id;
  const acc = await repo.accounts.create({
    id: "sys-1",
    name: "_system_charges",
    type: "savings",
    openingBalancePaise: 0,
    currentBalancePaise: 0,
    status: "active",
  });
  return acc.id;
}

describe("charge engine", () => {
  it("creates one charge per active customer with correct math", async () => {
    const { repo, engine } = await setupTwoCustomers();
    const r = await engine.run("2026-03", { actorId: "admin", now: new Date("2026-03-01T00:00:00Z") });
    expect(r.created).toBe(2);
    expect(r.skipped).toBe(1); // inactive
    const charges = await repo.charges.list({ periodMonth: "2026-03" });
    expect(charges).toHaveLength(2);
    const a = charges.find((c) => c.customerId === "cust-a")!;
    expect(a.baseAmountPaise).toBe(10000);
    expect(a.chargeAmountPaise).toBe(500); // 10000 * 500 / 10000
    const b = charges.find((c) => c.customerId === "cust-b")!;
    expect(b.baseAmountPaise).toBe(20000);
    expect(b.chargeAmountPaise).toBe(400);
  });

  it("is idempotent: second run same period skipped", async () => {
    const { repo, engine } = await setupTwoCustomers();
    await engine.run("2026-03", { actorId: "admin", now: new Date("2026-03-01T00:00:00Z") });
    const r2 = await engine.run("2026-03", { actorId: "admin", now: new Date("2026-03-01T00:00:00Z") });
    expect(r2.created).toBe(0);
    // all 3 customers either already charged or inactive -> skipped 3
    expect(r2.skipped).toBe(3);
    expect((await repo.charges.list({ periodMonth: "2026-03" })).length).toBe(2);
    expect((await repo.transactions.list({})).filter((t) => t.monthlyChargeId).length).toBe(2);
  });

  it("waive full with null waives entire charge and credits", async () => {
    const { repo, ledger, engine } = await setupTwoCustomers();
    await engine.run("2026-03", { actorId: "admin", now: new Date("2026-03-01T00:00:00Z") });
    const ch = (await repo.charges.list({ periodMonth: "2026-03" })).find((c) => c.customerId === "cust-a")!;
    const beforeTxCount = (await repo.transactions.list({})).length;
    const r = await engine.waive(ch.id, null, { actorId: "admin" });
    expect(r.charge.status).toBe("waived");
    expect(r.charge.waivedAmountPaise).toBe(ch.chargeAmountPaise);
    expect(r.waiveTx.direction).toBe("credit");
    expect(r.waiveTx.amountPaise).toBe(ch.chargeAmountPaise);
    expect((await repo.transactions.list({})).length).toBe(beforeTxCount + 1);
  });

  it("partial waive leaves reduced, second partial completes to waived", async () => {
    const { repo, engine } = await setupTwoCustomers();
    await engine.run("2026-03", { actorId: "admin", now: new Date("2026-03-01T00:00:00Z") });
    const ch = (await repo.charges.list({ periodMonth: "2026-03" })).find((c) => c.customerId === "cust-b")!;
    // charge 400
    const r1 = await engine.waive(ch.id, 100, { actorId: "admin" });
    expect(r1.charge.status).toBe("reduced");
    expect(r1.charge.waivedAmountPaise).toBe(100);
    const r2 = await engine.waive(ch.id, 300, { actorId: "admin" });
    expect(r2.charge.status).toBe("waived");
    expect(r2.charge.waivedAmountPaise).toBe(400);
  });

  it("null actor from cron writes audit as system without throw", async () => {
    const { repo, engine } = await setupTwoCustomers();
    const r = await engine.run("2026-03", { actorId: null, now: new Date("2026-03-01T00:00:00Z") });
    expect(r.created).toBe(2);
    const audits = await repo.audit.list({ action: "charge.post" });
    expect(audits.length).toBe(2);
    expect(audits.every((a) => a.actorId === null)).toBe(true);
  });

  it("system account is created explicitly once and reused", async () => {
    const repo = createMemoryRepo();
    const ledger = createLedger({ repo, clock, ids: ids("tx2"), allowSystemOverdraw: true });
    const engine = createChargeEngine({ repo, ledger, clock, ids: ids("ch2") });
    await repo.customers.create({
      id: "cust-x",
      name: "X",
      username: "x_user2",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
    });
    const sys = await ensureSystem(repo);
    await ledger.post({ direction: "debit", customerId: "cust-x", sourceType: "account", sourceId: sys, amountPaise: 1000 }, { actorId: "admin" });
    await engine.run("2026-04", { actorId: "admin", now: new Date("2026-04-01T00:00:00Z") });
    const accountsBefore = (await repo.accounts.list()).length;
    await engine.run("2026-05", { actorId: "admin", now: new Date("2026-05-01T00:00:00Z") });
    const accountsAfter = (await repo.accounts.list()).length;
    expect(accountsAfter).toBe(accountsBefore);
  });
});
