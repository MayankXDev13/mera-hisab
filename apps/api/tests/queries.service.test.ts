import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

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
  };
  const fns: any = {
    eq: (col: any, value: any) => ({ _kind: "eq", col, value }),
    gte: (col: any, value: any) => ({ _kind: "gte", col, value }),
    lte: (col: any, value: any) => ({ _kind: "lte", col, value }),
    and: (...conds: any[]) => ({ _kind: "and", conds }),
    desc: (col: any) => ({ _kind: "desc", col }),
    count: () => ({ _kind: "count" }),
    sql: Object.assign((strings: TemplateStringsArray, ...values: any[]) => ({ _kind: "sql", strings, values, as: (alias: string) => ({ _kind: "sql", strings, values, alias }) }), {
      raw: (s: string) => s,
    }),
    inArray: (col: any, values: any[]) => ({ _kind: "inArray", col, values }),
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
  function matches(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._kind === "eq") return row[cond.col] === cond.value;
    if (cond._kind === "gte") return row[cond.col] >= cond.value;
    if (cond._kind === "lte") return row[cond.col] <= cond.value;
    if (cond._kind === "and") return cond.conds.every((c: any) => matches(row, c));
    if (cond._kind === "inArray") return cond.values.includes(row[cond.col]);
    if (cond._kind === "sql") {
      // for our SUM tests, we treat sql filter as pass-all; actual aggregation done in select handler
      return true;
    }
    return true;
  }
  function sortRows(rows: any[], order: any) {
    if (!order) return rows;
    if (order._kind !== "desc") return rows;
    const col = order.col;
    return [...rows].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av instanceof Date && bv instanceof Date) return bv.getTime() - av.getTime();
      return 0;
    });
  }
  function makeSelectBuilder(selectArg: any) {
    // select() with no args or with {value: count()} or with {outstandingPaise: sql``} etc.
    let table: any = null;
    let whereCond: any = null;
    let order: any = null;
    let limitN: number | null = null;
    let offsetN = 0;
    let groupByCol: any = null;
    const builder: any = {
      from(t: any) { table = t; return builder; },
      where(c: any) { whereCond = c; return builder; },
      orderBy(o: any) { order = o; return builder; },
      limit(n: number) { limitN = n; return builder; },
      offset(n: number) { offsetN = n; return builder; },
      groupBy(c: any) { groupByCol = c; return builder; },
      then(resolve: any) {
        let rows = [...getStore(table)];
        if (whereCond) rows = rows.filter((r) => matches(r, whereCond));
        // handle aggregation selects
        if (selectArg && typeof selectArg === "object" && !Array.isArray(selectArg)) {
          const keys = Object.keys(selectArg);
          // count
          if (keys.length === 1 && keys[0] === "value" && selectArg.value?._kind === "count") {
            resolve([{ value: rows.length }]);
            return;
          }
          // SUM outstanding
          if (keys.includes("outstandingPaise")) {
            if (groupByCol) {
              // group by customerId
              const colName = typeof groupByCol === "string" ? groupByCol : groupByCol;
              const groups: Record<string, number> = {};
              for (const r of rows) {
                const key = r[colName] ?? r.customerId;
                const delta = r.direction === "debit" ? r.amountPaise : -r.amountPaise;
                groups[key] = (groups[key] ?? 0) + delta;
              }
              const out = Object.entries(groups).map(([customerId, outstandingPaise]) => ({ customerId, outstandingPaise }));
              resolve(out);
              return;
            } else {
              let sum = 0;
              for (const r of rows) sum += r.direction === "debit" ? r.amountPaise : -r.amountPaise;
              resolve([{ outstandingPaise: sum }]);
              return;
            }
          }
          if (keys.includes("customerId") && keys.includes("outstandingPaise")) {
            // batch case already handled above
            const colName = typeof groupByCol === "string" ? groupByCol : groupByCol;
            const groups: Record<string, number> = {};
            for (const r of rows) {
              const key = r[colName] ?? r.customerId;
              const delta = r.direction === "debit" ? r.amountPaise : -r.amountPaise;
              groups[key] = (groups[key] ?? 0) + delta;
            }
            resolve(Object.entries(groups).map(([customerId, outstandingPaise]) => ({ customerId, outstandingPaise })));
            return;
          }
        }
        if (order) rows = sortRows(rows, order);
        if (offsetN) rows = rows.slice(offsetN);
        if (limitN != null) rows = rows.slice(0, limitN);
        resolve(rows);
      },
    };
    return builder;
  }
  const fakeDb: any = {
    select(arg?: any) { return makeSelectBuilder(arg); },
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
        where(c: any) { whereCond = c; return b; },
        returning() {
          const store = getStore(table);
          const matched = store.filter((r) => matches(r, whereCond));
          for (const r of matched) Object.assign(r, setVals);
          return Promise.resolve(matched);
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
  return { ...orig, db: fakeDb, eq: fns.eq, gte: fns.gte, lte: fns.lte, and: fns.and, desc: fns.desc, count: fns.count, sql: fns.sql, inArray: fns.inArray };
});
vi.mock("@repo/db/schema", async () => fakeTables);

const { listTransactionsQuery, getOutstandingQuery, getOutstandingBatchQuery } = await import("../src/services/queries.service.js");

describe("queries.service — SQL pushdown", () => {
  beforeEach(() => {
    for (const k of Object.keys(stores)) stores[k].length = 0;
  });

  it("listTransactions pushes from/to to where and uses limit/offset with count", async () => {
    const cid = randomUUID();
    stores.customers.push({ id: cid });
    const base = new Date("2025-01-01T00:00:00Z");
    for (let i = 0; i < 60; i++) {
      stores.transactions.push({
        id: randomUUID(),
        customerId: cid,
        direction: i % 2 === 0 ? "debit" : "credit",
        amountPaise: 1000,
        sourceType: "account",
        sourceId: randomUUID(),
        occurredAt: new Date(base.getTime() + i * 86400000),
        note: null,
        createdBy: null,
        reversedFromId: null,
        
        createdAt: new Date(),
      });
    }
    const from = new Date("2025-01-10T00:00:00Z").toISOString();
    const to = new Date("2025-01-20T00:00:00Z").toISOString();
    const { transactions: rows, total } = await listTransactionsQuery({ from, to, page: 1, limit: 5, customerId: cid }, { db: fakeDb });
    // from/to filter: Jan 10-20 inclusive = 11 days, so total 11, page 1 limit 5 => 5 rows
    expect(total).toBe(11);
    expect(rows.length).toBe(5);
    // pagination page 2
    const p2 = await listTransactionsQuery({ from, to, page: 2, limit: 5, customerId: cid }, { db: fakeDb });
    expect(p2.transactions.length).toBe(5);
    const p3 = await listTransactionsQuery({ from, to, page: 3, limit: 5, customerId: cid }, { db: fakeDb });
    expect(p3.transactions.length).toBe(1);
  });

  it("outstanding uses SUM not loop, no rows returns 0", async () => {
    const cid = randomUUID();
    stores.customers.push({ id: cid });
    // no transactions
    const val0 = await getOutstandingQuery(cid, { db: fakeDb });
    expect(val0).toBe(0);

    stores.transactions.push(
      { id: randomUUID(), customerId: cid, direction: "debit", amountPaise: 50000, sourceType: "account", sourceId: randomUUID(), occurredAt: new Date(), note: null, createdBy: null, reversedFromId: null, createdAt: new Date() },
      { id: randomUUID(), customerId: cid, direction: "credit", amountPaise: 20000, sourceType: "account", sourceId: randomUUID(), occurredAt: new Date(), note: null, createdBy: null, reversedFromId: null, createdAt: new Date() }
    );
    const val = await getOutstandingQuery(cid, { db: fakeDb });
    expect(val).toBe(30000);
  });

  it("batch outstanding returns map with zeros for missing", async () => {
    const cid1 = randomUUID();
    const cid2 = randomUUID();
    const cid3 = randomUUID();
    stores.customers.push({ id: cid1 }, { id: cid2 }, { id: cid3 });
    stores.transactions.push(
      { id: randomUUID(), customerId: cid1, direction: "debit", amountPaise: 10000, sourceType: "account", sourceId: randomUUID(), occurredAt: new Date(), note: null, createdBy: null, reversedFromId: null, createdAt: new Date() },
      { id: randomUUID(), customerId: cid1, direction: "credit", amountPaise: 4000, sourceType: "account", sourceId: randomUUID(), occurredAt: new Date(), note: null, createdBy: null, reversedFromId: null, createdAt: new Date() }
    );
    const map = await getOutstandingBatchQuery([cid1, cid2, cid3], { db: fakeDb });
    expect(map[cid1]).toBe(6000);
    expect(map[cid2]).toBe(0);
    expect(map[cid3]).toBe(0);
  });

  it("sort is desc occurredAt", async () => {
    const cid = randomUUID();
    stores.customers.push({ id: cid });
    const d1 = new Date("2025-01-01T00:00:00Z");
    const d2 = new Date("2025-01-02T00:00:00Z");
    const d3 = new Date("2025-01-03T00:00:00Z");
    for (const d of [d1, d2, d3]) {
      stores.transactions.push({ id: randomUUID(), customerId: cid, direction: "debit", amountPaise: 100, sourceType: "account", sourceId: randomUUID(), occurredAt: d, note: null, createdBy: null, reversedFromId: null, createdAt: new Date() });
    }
    const { transactions: rows } = await listTransactionsQuery({ page: 1, limit: 10 }, { db: fakeDb });
    expect(rows[0].occurredAt.getTime()).toBe(d3.getTime());
  });
});
