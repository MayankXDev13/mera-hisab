import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const { stores, fakeTables, fakeDb, fns } = vi.hoisted(() => {
  const stores: Record<string, any[]> = {
    accounts: [],
    creditCards: [],
    customers: [],
    transactions: [],
    auditLogs: [],
    fundingSources: [],
    transactionAllocations: [],
  };
  function makeTable(name: string) {
    const table: any = { _name: name };
    return new Proxy(table, {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        return prop;
      },
    });
  }
  const fakeTables = {
    accounts: makeTable("accounts"),
    creditCards: makeTable("creditCards"),
    customers: makeTable("customers"),
    transactions: makeTable("transactions"),
    auditLogs: makeTable("auditLogs"),
    fundingSources: makeTable("fundingSources"),
    transactionAllocations: makeTable("transactionAllocations"),
  };
  const fns: any = {
    eq: (col: any, value: any) => ({ _kind: "eq", col, value }),
    and: (...conds: any[]) => ({ _kind: "and", conds }),
  };
  function getStore(table: any) {
    return stores[table?._name] ?? [];
  }
  function matches(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._kind === "eq") return row[cond.col] === cond.value;
    if (cond._kind === "and") return cond.conds.every((c: any) => matches(row, c));
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
          return { returning() { return Promise.resolve(inserted); } };
        },
      };
    },
    update(table: any) {
      let setVals: any = {};
      let whereCond: any = null;
      const run = () => {
        const store = getStore(table);
        const matched = store.filter((r) => matches(r, whereCond));
        for (const r of matched) Object.assign(r, setVals);
        return matched;
      };
      const b: any = {
        set(v: any) { setVals = v; return b; },
        where(c: any) {
          whereCond = c;
          const out: any = {
            returning() { return Promise.resolve(run()); },
          };
          out.then = (res: any, rej: any) => {
            try { res(run()); } catch (e) { rej?.(e); }
          };
          return out;
        },
        returning() { return Promise.resolve(run()); },
      };
      return b;
    },
    transaction: async (cb: any) => cb(fakeDb),
  };
  return { stores, fakeTables, fakeDb, fns };
});

vi.mock("@repo/db", async (importOriginal) => {
  const orig: any = await importOriginal();
  return { ...orig, db: fakeDb, eq: fns.eq, and: fns.and };
});
vi.mock("@repo/db/schema", async () => fakeTables);

const { createLedgerTransaction, LedgerError } = await import("../src/services/ledger.service.js");

const USER = "user-1";

describe("ledger.service — debits (injected db)", () => {
  beforeEach(() => {
    for (const k of Object.keys(stores)) stores[k].length = 0;
  });

  it("debit bank account sufficient balance", async () => {
    const cid = randomUUID();
    const fid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: fid, userId: USER, kind: "bank_account", status: "active", currentBalancePaise: 100000 });
    const row = await createLedgerTransaction(
      { direction: "debit", customerId: cid, sourceId: fid, amountPaise: 40000 },
      { db: fakeDb, actorId: USER }
    );
    expect(row.amountPaise).toBe(40000);
    expect(stores.fundingSources[0].currentBalancePaise).toBe(60000);
    expect(stores.auditLogs[0].actorId).toBe(USER);
  });

  it("insufficient balance throws 400", async () => {
    const cid = randomUUID();
    const fid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: fid, userId: USER, kind: "bank_account", status: "active", currentBalancePaise: 5000 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceId: fid, amountPaise: 10000 }, { db: fakeDb, actorId: USER })
    ).rejects.toThrow(/insufficient account balance/);
    expect(stores.transactions.length).toBe(0);
  });

  it("credit direction is rejected — repayments have their own endpoint", async () => {
    const cid = randomUUID();
    const fid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: fid, userId: USER, kind: "bank_account", status: "active", currentBalancePaise: 100000 });
    await expect(
      createLedgerTransaction({ direction: "credit", customerId: cid, sourceId: fid, amountPaise: 1 }, { db: fakeDb, actorId: USER })
    ).rejects.toThrow(/repayments must be recorded/);
  });

  it("missing actor is unauthorized", async () => {
    const cid = randomUUID();
    const fid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: fid, userId: USER, kind: "bank_account", status: "active", currentBalancePaise: 100000 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceId: fid, amountPaise: 100 }, { db: fakeDb })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("amountRupees string converts", async () => {
    const cid = randomUUID();
    const fid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: fid, userId: USER, kind: "bank_account", status: "active", currentBalancePaise: 200000 });
    const row = await createLedgerTransaction(
      { direction: "debit", customerId: cid, sourceId: fid, amountRupees: "1234.56" },
      { db: fakeDb, actorId: USER }
    );
    expect(row.amountPaise).toBe(123456);
  });

  it("card limit enforced on debit from a credit_card source", async () => {
    const cid = randomUUID();
    const cardId = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: cardId, userId: USER, kind: "credit_card", status: "active", totalLimitPaise: 50000, usedPaise: 40000 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceId: cardId, amountPaise: 20000 }, { db: fakeDb, actorId: USER })
    ).rejects.toThrow(/insufficient card limit/);

    const card2 = randomUUID();
    stores.fundingSources.push({ id: card2, userId: USER, kind: "credit_card", status: "deactivated", totalLimitPaise: 100000, usedPaise: 0 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceId: card2, amountPaise: 1000 }, { db: fakeDb, actorId: USER })
    ).rejects.toThrow(/deactivated/);
  });

  it("cannot lend from another user's funding source", async () => {
    const cid = randomUUID();
    const foreignSrc = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    stores.fundingSources.push({ id: foreignSrc, userId: "someone-else", kind: "bank_account", status: "active", currentBalancePaise: 999999 });
    await expect(
      createLedgerTransaction({ direction: "debit", customerId: cid, sourceId: foreignSrc, amountPaise: 100 }, { db: fakeDb, actorId: USER })
    ).rejects.toThrow(/not found/);
    expect(stores.transactions.length).toBe(0);
  });
});
