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
    gte: (col: any, value: any) => ({ _kind: "gte", col, value }),
    lte: (col: any, value: any) => ({ _kind: "lte", col, value }),
    and: (...conds: any[]) => ({ _kind: "and", conds }),
    desc: (col: any) => ({ _kind: "desc", col }),
    count: () => ({ _kind: "count" }),
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: any[]) => ({
        _kind: "sql",
        strings,
        values,
        as: (alias: string) => ({ _kind: "sql", strings, values, alias }),
      }),
      { raw: (s: string) => s },
    ),
    inArray: (col: any, values: any[]) => ({ _kind: "inArray", col, values }),
  };
  function getStore(table: any) {
    return stores[table?._name] ?? [];
  }
  function matches(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._kind === "eq") return row[cond.col] === cond.value;
    if (cond._kind === "gte") return new Date(row[cond.col]) >= cond.value;
    if (cond._kind === "lte") return new Date(row[cond.col]) <= cond.value;
    if (cond._kind === "and") return cond.conds.every((c: any) => matches(row, c));
    if (cond._kind === "inArray") return cond.values.includes(row[cond.col]);
    if (cond._kind === "sql") return true;
    if (cond._kind === "count") return true;
    return true;
  }
  function sortRows(rows: any[], order: any) {
    if (!order || order._kind !== "desc") return rows;
    const col = order.col;
    return [...rows].sort((a, b) => {
      const av = a[col], bv = b[col];
      if (av instanceof Date && bv instanceof Date) return bv.getTime() - av.getTime();
      return av > bv ? -1 : av < bv ? 1 : 0;
    });
  }
  function makeSelectBuilder(selectArg: any) {
    let table: any = null;
    let whereCond: any = null;
    let order: any = null;
    let limitN: number | null = null;
    let offsetN = 0;
    let groupByCol: any = null;
    const b: any = {
      from(t: any) { table = t; return b; },
      where(c: any) { whereCond = c; return b; },
      orderBy(o: any) { order = o; return b; },
      limit(n: number) { limitN = n; return b; },
      offset(n: number) { offsetN = n; return b; },
      groupBy(c: any) { groupByCol = c; return b; },
      then(resolve: any) {
        let rows = [...getStore(table)];
        if (whereCond) rows = rows.filter((r) => matches(r, whereCond));
        if (selectArg && typeof selectArg === "object" && !Array.isArray(selectArg)) {
          const keys = Object.keys(selectArg);
          // count(*) select
          if (keys.length === 1 && keys[0] === "value" && selectArg.value?._kind === "count") {
            resolve([{ value: rows.length }]);
            return;
          }
          // SUM-style aggregate with groupBy
          if (groupByCol && keys.includes("outstandingPaise")) {
            const groups: Record<string, number> = {};
            for (const r of rows) {
              const k = r[groupByCol];
              groups[k] = (groups[k] ?? 0) + (r.direction === "debit" ? r.amountPaise : -r.amountPaise);
            }
            resolve(Object.entries(groups).map(([customerId2, outstandingPaise]) => ({ customerId: customerId2, outstandingPaise })));
            return;
          }
          if (keys.includes("total")) {
            const groups: Record<string, number> = {};
            for (const r of rows) groups[r[groupByCol]] = (groups[r[groupByCol]] ?? 0) + r.amountPaise;
            resolve(Object.entries(groups).map(([sourceId, total]) => ({ sourceId, total })));
            return;
          }
          if (keys.includes("outstandingPaise")) {
            let sum = 0;
            for (const r of rows) sum += r.direction === "debit" ? r.amountPaise : -r.amountPaise;
            resolve([{ outstandingPaise: sum }]);
            return;
          }
        }
        if (order) rows = sortRows(rows, order);
        if (offsetN) rows = rows.slice(offsetN);
        if (limitN != null) rows = rows.slice(0, limitN);
        resolve(rows);
      },
    };
    return b;
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
  return { ...orig, db: fakeDb, eq: fns.eq, gte: fns.gte, lte: fns.lte, and: fns.and, desc: fns.desc, count: fns.count, sql: fns.sql, inArray: fns.inArray };
});
vi.mock("@repo/db/schema", async () => fakeTables);

const { listTransactionsQuery, getOutstandingQuery, getOutstandingBatchQuery, listFundingSourcesQuery } =
  await import("../src/services/queries.service.js");

const USER = "user-1";

function seedDebit(customerId: string, sourceId: string | null, amountPaise: number, occurredAt?: Date) {
  stores.transactions.push({
    id: randomUUID(), userId: USER, direction: "debit", amountPaise,
    customerId, sourceId, occurredAt: occurredAt ?? new Date(), note: null, createdBy: USER, createdAt: new Date(),
  });
}

describe("queries.service — scoped reads", () => {
  beforeEach(() => {
    for (const k of Object.keys(stores)) stores[k].length = 0;
  });

  it("list pushes from/to to where with count and limit/offset", async () => {
    const cid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    const base = new Date("2025-01-01T00:00:00Z");
    for (let i = 0; i < 60; i++) {
      seedDebit(cid, randomUUID(), 1000, new Date(base.getTime() + i * 86400000));
    }
    const from = new Date("2025-01-10T00:00:00Z").toISOString();
    const to = new Date("2025-01-20T00:00:00Z").toISOString();
    const p1 = await listTransactionsQuery(USER, { customerId: cid, from, to, page: 1, limit: 5 }, { db: fakeDb });
    expect(p1.total).toBe(11);
    expect(p1.transactions.length).toBe(5);
    const p3 = await listTransactionsQuery(USER, { customerId: cid, from, to, page: 3, limit: 5 }, { db: fakeDb });
    expect(p3.transactions.length).toBe(1);
  });

  it("getOutstanding sums debits minus credits per user scope", async () => {
    const cid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    expect(await getOutstandingQuery(USER, cid, { db: fakeDb })).toBe(0);
    seedDebit(cid, randomUUID(), 50000);
    stores.transactions.push({
      id: randomUUID(), userId: USER, direction: "credit", amountPaise: 20000,
      customerId: cid, sourceId: null, occurredAt: new Date(), note: null, createdBy: USER, createdAt: new Date(),
    });
    expect(await getOutstandingQuery(USER, cid, { db: fakeDb })).toBe(30000);
  });

  it("batch outstanding returns zeros for missing ids", async () => {
    const c1 = randomUUID(), c2 = randomUUID(), c3 = randomUUID();
    stores.customers.push({ id: c1, userId: USER }, { id: c2, userId: USER }, { id: c3, userId: USER });
    seedDebit(c1, randomUUID(), 10000);
    seedDebit(c1, randomUUID(), 4000);
    const map = await getOutstandingBatchQuery(USER, [c1, c2, c3], { db: fakeDb });
    expect(map[c1]).toBe(14000);
    expect(map[c2]).toBe(0);
    expect(map[c3]).toBe(0);
  });

  it("sort is desc occurredAt and other users' rows are invisible", async () => {
    const cid = randomUUID();
    stores.customers.push({ id: cid, userId: USER });
    const d1 = new Date("2025-01-01T00:00:00Z");
    const d3 = new Date("2025-01-03T00:00:00Z");
    seedDebit(cid, randomUUID(), 100, d1);
    // another tenant's txn must not leak in
    stores.transactions.push({
      id: randomUUID(), userId: "other-user", direction: "debit", amountPaise: 999999,
      customerId: cid, sourceId: randomUUID(), occurredAt: d3, note: null, createdBy: "other-user", createdAt: new Date(),
    });
    seedDebit(cid, randomUUID(), 100, new Date("2025-01-02T00:00:00Z"));
    const { transactions: rows } = await listTransactionsQuery(USER, { page: 1, limit: 10 }, { db: fakeDb });
    expect(rows).toHaveLength(2);
    expect(new Date(rows[0].occurredAt).getTime()).toBe(new Date("2025-01-02T00:00:00Z").getTime());
  });

  it("funding sources list filters by kind", async () => {
    stores.fundingSources.push(
      { id: randomUUID(), userId: USER, kind: "bank_account", status: "active", createdAt: new Date() },
      { id: randomUUID(), userId: USER, kind: "credit_card", status: "active", createdAt: new Date() },
      { id: randomUUID(), userId: "other-user", kind: "bank_account", status: "active", createdAt: new Date() },
    );
    const banks = await listFundingSourcesQuery(USER, "bank_account", { db: fakeDb });
    expect(banks).toHaveLength(1);
  });
});
