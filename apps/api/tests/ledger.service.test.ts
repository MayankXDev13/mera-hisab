import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Hoisted mock for schema so service sees our fake tables
const { stores, fakeTables, fakeDb, fns } = vi.hoisted(() => {
  const stores: Record<string, any[]> = {
    accounts: [],
    creditCards: [],
    customers: [],
    transactions: [],
    auditLogs: [],
  };
  function makeTable(name: string) {
    const table: any = { _name: name };
    return new Proxy(table, {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        return prop; // column is just string name
      },
    });
  }
  const fakeTables = {
    accounts: makeTable("accounts"),
    creditCards: makeTable("creditCards"),
    customers: makeTable("customers"),
    transactions: makeTable("transactions"),
    auditLogs: makeTable("auditLogs"),
  };
  const fns = {
    eq: (col: any, value: any) => ({ _kind: "eq", col, value }),
  };
  function getStore(table: any) {
    const name = table?._name;
    const map: Record<string, string> = {
      accounts: "accounts",
      creditCards: "creditCards",
      customers: "customers",
      transactions: "transactions",
      auditLogs: "auditLogs",
    };
    return stores[map[name] ?? name] ?? [];
  }
  function matches(row: any, cond: any) {
    if (!cond) return true;
    if (cond._kind === "eq") return row[cond.col] === cond.value;
    return true;
  }
  function makeSelect() {
    let table: any = null;
    let whereCond: any = null;
    let limitN: number | null = null;
    const b: any = {
      from(t: any) { table = t; return b; },
      where(c: any) { whereCond = c; return b; },
      limit(n: number) { limitN = n; return b; },
      orderBy() { return b; },
      then(resolve: any) {
        let rows = [...getStore(table)];
        if (whereCond) rows = rows.filter((r) => matches(r, whereCond));
        if (limitN != null) rows = rows.slice(0, limitN);
        resolve(rows);
      },
    };
    return b;
  }
  const fakeDb: any = {
    select() { return makeSelect(); },
    insert(table: any) {
      return {
        values(vals: any) {
          const rows = Array.isArray(vals) ? vals : [vals];
          const store = getStore(table);
          const inserted = rows.map((v: any) => {
            const row = { id: v.id ?? randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...v };
            store.push(row);
            return row;
          });
          return {
            returning() { return Promise.resolve(inserted); },
            then(r: any) { r(inserted); },
          };
        },
      };
    },
    update(table: any) {
      let setVals: any = {};
      let whereCond: any = null;
      const b: any = {
        set(v: any) { setVals = v; return b; },
        where(c: any) { whereCond = c; return b; },
        returning() {
          const store = getStore(table);
          const matched = store.filter((r) => matches(r, whereCond));
          for (const r of matched) Object.assign(r, setVals);
          return Promise.resolve(matched);
        },
        then(r: any) {
          const store = getStore(table);
          const matched = store.filter((r) => matches(r, whereCond));
          for (const r of matched) Object.assign(r, setVals);
          r(matched);
        },
      };
      return b;
    },
    transaction: async (cb: any) => cb(fakeDb),
  };
  return { stores, fakeTables, fakeDb, fns };
});

vi.mock("@repo/db", async (importOriginal) => {
  const orig: any = await importOriginal();
  return { ...orig, db: fakeDb, eq: fns.eq };
});
vi.mock("@repo/db/schema", async () => fakeTables);

const { createLedgerTransaction, reverseLedgerTransaction } = await import("../src/services/ledger.service.js");

describe("ledger.service — boundary tests (injected db)", () => {
  beforeEach(() => {
    for (const k of Object.keys(stores)) stores[k].length = 0;
  });

  it("debit account sufficient", async () => {
    const cid = randomUUID();
    const aid = randomUUID();
    stores.customers.push({ id: cid, status: "active" });
    stores.accounts.push({ id: aid, status: "active", currentBalancePaise: 100000 });
    const row = await createLedgerTransaction(
      { direction: "debit", customerId: cid, sourceType: "account", sourceId: aid, amountPaise: 40000 },
      { db: fakeDb, actorId: "actor-1" }
    );
    expect(row.amountPaise).toBe(40000);
    expect(stores.accounts[0].currentBalancePaise).toBe(60000);
    expect(stores.auditLogs[0].actorId).toBe("actor-1");
  });

  it("insufficient balance throws 400", async () => {
    const cid = randomUUID();
    const aid = randomUUID();
    stores.customers.push({ id: cid });
    stores.accounts.push({ id: aid, status: "active", currentBalancePaise: 5000 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceType: "account", sourceId: aid, amountPaise: 10000 }, { db: fakeDb, actorId: null })
    ).rejects.toThrow(/insufficient account balance/);
    expect(stores.transactions.length).toBe(0);
  });

  it("credit increments", async () => {
    const cid = randomUUID();
    const aid = randomUUID();
    stores.customers.push({ id: cid });
    stores.accounts.push({ id: aid, status: "active", currentBalancePaise: 50000 });
    await createLedgerTransaction({ direction: "credit", customerId: cid, sourceType: "account", sourceId: aid, amountPaise: 20000 }, { db: fakeDb, actorId: null });
    expect(stores.accounts[0].currentBalancePaise).toBe(70000);
  });

  it("amountRupees string converts", async () => {
    const cid = randomUUID();
    const aid = randomUUID();
    stores.customers.push({ id: cid });
    stores.accounts.push({ id: aid, status: "active", currentBalancePaise: 200000 });
    const row = await createLedgerTransaction({ direction: "debit", customerId: cid, sourceType: "account", sourceId: aid, amountRupees: "1234.56" }, { db: fakeDb, actorId: null });
    expect(row.amountPaise).toBe(123456);
  });

  it("card limit and deactivated", async () => {
    const cid = randomUUID();
    const cardId = randomUUID();
    stores.customers.push({ id: cid });
    stores.creditCards.push({ id: cardId, status: "active", totalLimitPaise: 50000, usedPaise: 40000 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceType: "credit_card", sourceId: cardId, amountPaise: 20000 }, { db: fakeDb, actorId: null })
    ).rejects.toThrow(/insufficient card limit/);

    const cardId2 = randomUUID();
    stores.creditCards.push({ id: cardId2, status: "deactivated", totalLimitPaise: 100000, usedPaise: 0 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceType: "credit_card", sourceId: cardId2, amountPaise: 1000 }, { db: fakeDb, actorId: null })
    ).rejects.toThrow(/card is deactivated/);
  });

  it("actorId null results in null createdBy and audit actor", async () => {
    const cid = randomUUID();
    const aid = randomUUID();
    stores.customers.push({ id: cid });
    stores.accounts.push({ id: aid, status: "active", currentBalancePaise: 100000 });
    const row = await createLedgerTransaction({ direction: "debit", customerId: cid, sourceType: "account", sourceId: aid, amountPaise: 1000 }, { db: fakeDb, actorId: null });
    expect(row.createdBy).toBe(null);
    expect(stores.auditLogs[0].actorId).toBe(null);
  });

  it("reversal inverts and restores balance", async () => {
    const cid = randomUUID();
    const aid = randomUUID();
    stores.customers.push({ id: cid });
    stores.accounts.push({ id: aid, status: "active", currentBalancePaise: 100000 });
    const orig = await createLedgerTransaction({ direction: "debit", customerId: cid, sourceType: "account", sourceId: aid, amountPaise: 40000 }, { db: fakeDb, actorId: "a" });
    expect(stores.accounts[0].currentBalancePaise).toBe(60000);
    const rev = await reverseLedgerTransaction(orig.id, { db: fakeDb, actorId: "a" });
    expect(rev.direction).toBe("credit");
    expect(rev.reversedFromId).toBe(orig.id);
    expect(stores.accounts[0].currentBalancePaise).toBe(100000);
  });
});
