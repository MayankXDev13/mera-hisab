import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

// fake db covering funding_sources, customers, transactions, transaction_allocations, audit_logs
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
    inArray: (col: any, values: any[]) => ({ _kind: "inArray", col, values }),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: any[]) => ({
        _kind: "sql",
        strings,
        values,
        as: (alias: string) => ({ _kind: "sql", strings, values, alias }),
      }),
      { raw: (s: string) => s },
    ),
  };
  function getStore(table: any) {
    const name = table?._name;
    return stores[name] ?? [];
  }
  function matches(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._kind === "eq") {
      const key = typeof cond.col === "string" ? cond.col : cond.col;
      return row[key] === cond.value;
    }
    if (cond._kind === "and") return cond.conds.every((c: any) => matches(row, c));
    if (cond._kind === "inArray") return cond.values.includes(row[cond.col]);
    if (cond._kind === "sql") return true; // direction CASE handled by aggregation branches
    return true;
  }
  function makeSelect(selectArg: any) {
    let table: any = null;
    let whereCond: any = null;
    let groupByCol: any = null;
    let limitN: number | null = null;
    const b: any = {
      from(t: any) { table = t; return b; },
      where(c: any) { whereCond = c; return b; },
      groupBy(c: any) { groupByCol = c; return b; },
      limit(n: number) { limitN = n; return b; },
      then(resolve: any) {
        let rows = [...getStore(table)];
        if (whereCond) rows = rows.filter((r) => matches(r, whereCond));
        if (selectArg && !Array.isArray(selectArg)) {
          const keys = Object.keys(selectArg);
          if (keys.includes("outstandingPaise") && keys.includes("sourceId")) {
            const groups: Record<string, number> = {};
            for (const r of rows) {
              const k = r[groupByCol] ?? r.sourceId ?? r.customerId;
              groups[k] = (groups[k] ?? 0);
            }
            // amount column differs between tables
            const amtKey = rows.length && "amountPaise" in rows[0] ? "amountPaise" : "amountPaise";
            for (const r of rows) {
              const k = r[groupByCol];
              groups[k] = (groups[k] ?? 0) + r[amtKey];
            }
            resolve(Object.entries(groups).map(([sourceId, total]) => ({ sourceId, total })));
            return;
          }
          if (keys.includes("outstandingPaise")) {
            const amtKey = "amountPaise";
            let sum = 0;
            for (const r of rows) sum += r.direction === "credit" ? -r[amtKey] : r[amtKey];
            resolve([{ outstandingPaise: sum }]);
            return;
          }
          if (keys.includes("total")) {
            const groups: Record<string, number> = {};
            for (const r of rows) {
              groups[r[groupByCol]] = (groups[r[groupByCol]] ?? 0) + r.amountPaise;
            }
            resolve(Object.entries(groups).map(([sourceId, total]) => ({ sourceId, total })));
            return;
          }
        }
        if (limitN != null) rows = rows.slice(0, limitN);
        resolve(rows);
      },
    };
    return b;
  }
  const fakeDb: any = {
    select(arg?: any) { return makeSelect(arg); },
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
      const b: any = {
        set(v: any) { setVals = v; return b; },
        where(c: any) {
          whereCond = c;
          const run = () => {
            const store = getStore(table);
            const matched = store.filter((r) => matches(r, whereCond));
            for (const r of matched) Object.assign(r, setVals);
            return matched;
          };
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
    delete(table: any) {
      let whereCond: any = null;
      return {
        where(c: any) { whereCond = c; return {
          returning() {
            const store = getStore(table);
            const matched = store.filter((r) => matches(r, whereCond));
            for (const r of matched) store.splice(store.indexOf(r), 1);
            return Promise.resolve(matched);
          },
        }; },
      };
    },
    transaction: async (cb: any) => cb(fakeDb),
  };
  return { stores, fakeTables, fakeDb, fns };
});

vi.mock("@repo/db", async (importOriginal) => {
  const orig: any = await importOriginal();
  return { ...orig, db: fakeDb, eq: fns.eq, and: fns.and, inArray: fns.inArray, sql: fns.sql };
});
vi.mock("@repo/db/schema", async () => fakeTables);

const { createLedgerTransaction } = await import("../src/services/ledger.service.js");
const { createRepayment, getSourceOutstanding } = await import("../src/services/repayment.service.js");

const USER = "user-1";

function seedSource(kind: "bank_account" | "credit_card", balance: Partial<Record<string, number>> = {}) {
  const id = randomUUID();
  stores.fundingSources.push({
    id,
    userId: USER,
    kind,
    name: kind,
    status: "active",
    ...(kind === "bank_account"
      ? { openingBalancePaise: balance.opening ?? 100000, currentBalancePaise: balance.current ?? balance.opening ?? 100000 }
      : { totalLimitPaise: balance.limitAmt ?? 100000, usedPaise: balance.used ?? 0 }),
  });
  return id;
}

function seedCustomer() {
  const cid = randomUUID();
  stores.customers.push({ id: cid, userId: USER });
  return cid;
}

function seedDebit(customerId: string, sourceId: string, amountPaise: number) {
  const id = randomUUID();
  stores.transactions.push({
    id, userId: USER, direction: "debit", amountPaise,
    customerId, sourceId, occurredAt: new Date(), note: null, createdBy: USER, createdAt: new Date(),
  });
  return id;
}

describe("repayments — allocation engine", () => {
  beforeEach(() => {
    for (const k of Object.keys(stores)) stores[k].length = 0;
  });

  it("rejects generic credit transactions — repayments use the endpoint", async () => {
    const cid = seedCustomer();
    await expect(
      createLedgerTransaction({ direction: "credit", customerId: cid, sourceId: seedSource("bank_account"), amountPaise: 1 }, { db: fakeDb, actorId: USER })
    ).rejects.toThrow(/repayments must be recorded/);
  });

  it("single-source repayment: one credit txn + one allocation", async () => {
    const cid = seedCustomer();
    const sid = seedSource("bank_account");
    seedDebit(cid, sid, 50000);
    const { transaction, allocations } = await createRepayment(USER, {
      customerId: cid, mode: "manual",
      allocations: [{ sourceId: sid, amountPaise: 20000 }],
    }, { db: fakeDb });
    expect(transaction.direction).toBe("credit");
    expect(transaction.sourceId).toBeNull();
    expect(transaction.amountPaise).toBe(20000);
    expect(allocations).toHaveLength(1);
    expect(stores.transactionAllocations[0].amountPaise).toBe(20000);
  });

  it("multi-source manual split across two sources", async () => {
    const cid = seedCustomer();
    const s1 = seedSource("bank_account");
    const s2 = seedSource("bank_account");
    seedDebit(cid, s1, 10000);
    seedDebit(cid, s2, 30000);
    const { allocations } = await createRepayment(USER, {
      customerId: cid, mode: "manual",
      allocations: [{ sourceId: s1, amountPaise: 4000 }, { sourceId: s2, amountPaise: 6000 }],
    }, { db: fakeDb });
    expect(allocations.map((a: any) => a.amountPaise)).toEqual([4000, 6000]);
  });

  it("fifo allocates oldest outstanding first", async () => {
    const cid = seedCustomer();
    const oldSrc = seedSource("bank_account");
    const newSrc = seedSource("bank_account");
    const oldTxn = seedDebit(cid, oldSrc, 10000);
    seedDebit(cid, newSrc, 30000);
    // backdate the first debit so it is oldest
    stores.transactions.find((t: any) => t.id === oldTxn).occurredAt = new Date("2024-01-01");
    const { allocations } = await createRepayment(USER, { customerId: cid, mode: "fifo", amountPaise: 15000 }, { db: fakeDb });
    expect(allocations[0].sourceId).toBe(oldSrc);
    expect(allocations[0].amountPaise).toBe(10000);
    expect(allocations[1].amountPaise).toBe(5000);
  });

  it("repayment larger than total outstanding fails", async () => {
    const cid = seedCustomer();
    const sid = seedSource("bank_account");
    seedDebit(cid, sid, 10000);
    await expect(
      createRepayment(USER, { customerId: cid, mode: "fifo", amountPaise: 20000 }, { db: fakeDb })
    ).rejects.toThrow(/exceeds total outstanding/);
  });

  it("allocation exceeding a source outstanding fails", async () => {
    const cid = seedCustomer();
    const sid = seedSource("bank_account");
    seedDebit(cid, sid, 10000);
    await expect(
      createRepayment(USER, { customerId: cid, mode: "manual", allocations: [{ sourceId: sid, amountPaise: 20000 }] }, { db: fakeDb })
    ).rejects.toThrow(/exceeds source outstanding/);
  });

  it("allocation total mismatch fails", async () => {
    const cid = seedCustomer();
    const sid = seedSource("bank_account");
    seedDebit(cid, sid, 10000);
    await expect(
      createRepayment(USER, { customerId: cid, mode: "manual", amountPaise: 5000, allocations: [{ sourceId: sid, amountPaise: 3000 }] }, { db: fakeDb })
    ).rejects.toThrow(/must equal repayment amount/);
  });

  it("card over-allocation is rejected, not clamped", async () => {
    const cid = seedCustomer();
    const cardId = seedSource("credit_card", { limitAmt: 100000, used: 8000 });
    seedDebit(cid, cardId, 8000);
    // try to clear more than the card's used
    await expect(
      createRepayment(USER, { customerId: cid, mode: "manual", allocations: [{ sourceId: cardId, amountPaise: 9000 }] }, { db: fakeDb })
    ).rejects.toThrow(/overpay|exceeds/);
    expect(stores.fundingSources.find((f: any) => f.id === cardId).usedPaise).toBe(8000);
  });

  it("per-source outstanding reflects debits minus allocations", async () => {
    const cid = seedCustomer();
    const s1 = seedSource("bank_account");
    const s2 = seedSource("bank_account");
    seedDebit(cid, s1, 10000);
    seedDebit(cid, s2, 30000);
    await createRepayment(USER, {
      customerId: cid, mode: "manual",
      allocations: [{ sourceId: s1, amountPaise: 10000 }, { sourceId: s2, amountPaise: 15000 }],
    }, { db: fakeDb });
    const breakdown = await getSourceOutstanding(USER, cid, { db: fakeDb });
    expect(breakdown.total).toBe(15000);
    const map = new Map(breakdown.sources.map((s) => [s.sourceId, s.outstandingPaise]));
    expect(map.get(s1)).toBe(0);
    expect(map.get(s2)).toBe(15000);
  });

  it("negative allocation is rejected by schema and service", async () => {
    const cid = seedCustomer();
    const sid = seedSource("bank_account");
    seedDebit(cid, sid, 10000);
    await expect(
      createRepayment(USER, {
        customerId: cid, mode: "manual",
        allocations: [{ sourceId: sid, amountPaise: -500 }],
      }, { db: fakeDb })
    ).rejects.toThrow();
    expect(stores.transactionAllocations.length).toBe(0);
  });

  it("audit log records the repayment with allocations", async () => {
    const cid = seedCustomer();
    const sid = seedSource("bank_account");
    seedDebit(cid, sid, 10000);
    await createRepayment(USER, { customerId: cid, mode: "manual", allocations: [{ sourceId: sid, amountPaise: 4000 }] }, { db: fakeDb });
    expect(stores.auditLogs.length).toBe(1);
    expect(stores.auditLogs[0].action).toBe("repayment.create");
    expect(stores.auditLogs[0].actorId).toBe(USER);
    expect(stores.auditLogs[0].after.allocations).toHaveLength(1);
  });

  it("rollback on failure leaves no partial allocation rows", async () => {
    const cid = seedCustomer();
    const good = seedSource("bank_account");
    seedDebit(cid, good, 10000);
    const before = stores.transactions.length;
    await expect(
      createRepayment(USER, {
        customerId: cid, mode: "manual",
        allocations: [{ sourceId: good, amountPaise: 2000 }, { sourceId: randomUUID(), amountPaise: 1000 }],
      }, { db: fakeDb })
    ).rejects.toThrow();
    // fake db has no real rollback — assert nothing was written because checks precede inserts
    expect(stores.transactions.length).toBe(before);
    expect(stores.transactionAllocations.length).toBe(0);
  });
});
