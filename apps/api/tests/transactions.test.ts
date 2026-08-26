import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

// --- hoisted fakes so vi.mock hoisting can capture them ---
const { stores, fakeTables, fns, fakeDb } = vi.hoisted(() => {
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
        // drizzle columns are objects; we return sentinel with table+column
        return { _isColumn: true, table: name, column: prop };
      },
    });
  }

  const fakeTables = {
    accounts: makeTable("accounts"),
    creditCards: makeTable("creditCards"),
    customers: makeTable("customers"),
    transactions: makeTable("transactions"),
    auditLogs: makeTable("auditLogs"),
    user: makeTable("user"),
    session: makeTable("session"),
    account: makeTable("account"),
    verification: makeTable("verification"),
    monthlyCharges: makeTable("monthlyCharges"),
  };

  const fns = {
    eq: (col: any, value: any) => ({ _kind: "eq", col, value }),
    and: (...conds: any[]) => ({ _kind: "and", conds }),
    asc: (col: any) => ({ _kind: "asc", col }),
    desc: (col: any) => ({ _kind: "desc", col }),
  };

  function getStoreForTable(table: any): any[] {
    const name = table?._name;
    if (!name) return [];
    // map fake table names to stores keys (note creditCards vs credit_cards)
    const map: Record<string, string> = {
      accounts: "accounts",
      creditCards: "creditCards",
      customers: "customers",
      transactions: "transactions",
      auditLogs: "auditLogs",
      user: "user",
      session: "session",
      account: "account",
      verification: "verification",
      monthlyCharges: "monthlyCharges",
    };
    const key = map[name] ?? name;
    return stores[key] ?? [];
  }

  function matches(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._kind === "eq") {
      const col = cond.col?.column ?? cond.col;
      // col may be string sentinel; row key is camelCase
      const key = typeof col === "string" ? col : col;
      return row[key] === cond.value;
    }
    if (cond._kind === "and") {
      return cond.conds.every((c: any) => matches(row, c));
    }
    return true;
  }

  function sortRows(rows: any[], order: any) {
    if (!order) return rows;
    const colName = order.col?.column;
    if (!colName) return rows;
    const dir = order._kind === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = a[colName];
      const bv = b[colName];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // for Date strings or numbers
      if (av instanceof Date && bv instanceof Date) return (av.getTime() - bv.getTime()) * dir;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return (av > bv ? 1 : -1) * dir;
    });
  }

  // builders
  function makeSelectBuilder() {
    let table: any = null;
    let whereCond: any = null;
    let order: any = null;
    let limitN: number | null = null;
    const builder: any = {
      from(t: any) {
        table = t;
        return builder;
      },
      where(c: any) {
        whereCond = c;
        return builder;
      },
      orderBy(o: any) {
        order = o;
        return builder;
      },
      limit(n: number) {
        limitN = n;
        return builder;
      },
      // make thenable so await works
      then(resolve: any, reject: any) {
        try {
          let rows = [...getStoreForTable(table)];
          if (whereCond) rows = rows.filter((r) => matches(r, whereCond));
          if (order) rows = sortRows(rows, order);
          if (limitN != null) rows = rows.slice(0, limitN);
          resolve(rows);
        } catch (e) {
          reject(e);
        }
      },
      // also catch
      catch() {
        return builder;
      },
    };
    return builder;
  }

   const fakeDb: any = {
    select() {
      return makeSelectBuilder();
    },
    insert(table: any) {
      return {
        values(vals: any) {
          const rows = Array.isArray(vals) ? vals : [vals];
          const buildInserted = () => {
            const store = getStoreForTable(table);
            const inserted: any[] = rows.map((v: any) => {
              const now = new Date();
              const row: any = {
                id: v.id ?? randomUUID(),
                createdAt: v.createdAt ?? now,
                updatedAt: v.updatedAt ?? now,
                ...v,
              };
              store.push(row);
              return row;
            });
            return inserted;
          };
          const builder: any = {
            returning() {
              const inserted = buildInserted();
              return Promise.resolve(inserted);
            },
            then(resolve: any, reject: any) {
              try {
                const inserted = buildInserted();
                // drizzle without returning resolves to empty? but we return inserted for convenience
                resolve(inserted);
              } catch (e) {
                reject(e);
              }
            },
            catch() {
              return builder;
            },
          };
          return builder;
        },
      };
    },
    update(table: any) {
      let setVals: any = {};
      let whereCond: any = null;
      const apply = () => {
        const store = getStoreForTable(table);
        const matched = store.filter((r) => matches(r, whereCond));
        for (const r of matched) {
          Object.assign(r, setVals);
        }
        return matched;
      };
      const builder: any = {
        set(vals: any) {
          setVals = vals;
          return builder;
        },
        where(c: any) {
          whereCond = c;
          return builder;
        },
        returning() {
          const matched = apply();
          return Promise.resolve(matched);
        },
        then(resolve: any, reject: any) {
          try {
            const matched = apply();
            resolve(matched);
          } catch (e) {
            reject(e);
          }
        },
        catch() {
          return builder;
        },
      };
      return builder;
    },
    transaction: async (cb: any) => {
      // simple: pass fakeDb itself as tx (shares stores)
      return cb(fakeDb);
    },
  };

  return { stores, fakeTables, fns, fakeDb };
});

// mock @repo/db to use fakeDb and helpers
vi.mock("@repo/db", async (importOriginal) => {
  const orig: any = await importOriginal();
  return {
    ...orig,
    db: fakeDb,
    eq: fns.eq,
    asc: fns.asc,
    desc: fns.desc,
    and: fns.and,
  };
});

// mock schema tables to return fakeTables sentinels (so from() identity matches)
vi.mock("@repo/db/schema", async () => {
  return fakeTables;
});

// mock auth middleware to bypass better-auth
vi.mock("../src/middlewares/auth.js", () => ({
  requireSession: (req: any, _res: any, next: any) => {
    req.user = { id: "test-actor-id" };
    req.session = { id: "test-session-id" };
    next();
  },
}));

// Import app AFTER mocks are set up
const { createApp } = await import("../src/app.js");
import request from "supertest";

describe("POST /api/transactions — tracer bullet (TDD)", () => {
  beforeEach(() => {
    // reset all stores
    for (const k of Object.keys(stores)) stores[k].length = 0;
  });

  it("RED: authenticated user can create debit transaction against active account with sufficient balance (tracer)", async () => {
    const app = createApp();

    const customerId = randomUUID();
    const accountId = randomUUID();

    // seed customer
    stores.customers.push({
      id: customerId,
      name: "Asha Kumar",
      username: "asha_kumar",
      email: "asha@example.com",
      phone: "+919999999999",
      notes: null,
      monthlyRateBps: 200, // 2%
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // seed account with sufficient balance (₹1000 = 100000 paise)
    stores.accounts.push({
      id: accountId,
      name: "HDFC Savings",
      type: "savings",
      openingBalancePaise: 100000,
      currentBalancePaise: 100000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/transactions")
      .send({
        direction: "debit",
        customerId,
        sourceType: "account",
        sourceId: accountId,
        amountPaise: 50000,
        note: "loan to Asha",
      });

    // This is the observable behavior through public API
    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      direction: "debit",
      amountPaise: 50000,
      customerId,
      sourceType: "account",
      sourceId: accountId,
    });
    expect(typeof res.body.transaction.id).toBe("string");
    expect(typeof res.body.transaction.createdAt).toBe("string");

    // balance should be decremented
    const acc = stores.accounts.find((a) => a.id === accountId);
    expect(acc.currentBalancePaise).toBe(50000);

    // audit log created
    expect(stores.auditLogs.length).toBe(1);
    expect(stores.auditLogs[0].action).toBe("transaction.create");

    // transaction persisted
    expect(stores.transactions.length).toBe(1);
    expect(stores.transactions[0].amountPaise).toBe(50000);
  });

  it("validation fails when neither amountPaise nor amountRupees provided → 422", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "Ravi",
      username: "ravi_1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "ICICI",
      type: "savings",
      openingBalancePaise: 50000,
      currentBalancePaise: 50000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      // missing amount
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Validation failed");
  });

  it("validation fails when both amountPaise and amountRupees provided → 422", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "Ravi",
      username: "ravi_2",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "ICICI",
      type: "savings",
      openingBalancePaise: 50000,
      currentBalancePaise: 50000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountPaise: 10000,
      amountRupees: "100.00",
    });
    expect(res.status).toBe(422);
  });

  it("returns 404 when customer does not exist", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    // only account seeded, not customer
    stores.accounts.push({
      id: accountId,
      name: "SBI",
      type: "savings",
      openingBalancePaise: 50000,
      currentBalancePaise: 50000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountPaise: 10000,
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/customer not found/);
  });

  it("returns 400 when account has insufficient balance", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "Meena",
      username: "meena_insuf",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 150,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "LowBal",
      type: "savings",
      openingBalancePaise: 5000,
      currentBalancePaise: 5000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountPaise: 10000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient account balance/);
    // balance unchanged
    expect(stores.accounts[0].currentBalancePaise).toBe(5000);
    expect(stores.transactions.length).toBe(0);
  });

  it("returns 400 when account is deactivated", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "Deact Test",
      username: "deact_test",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "Deact Acc",
      type: "savings",
      openingBalancePaise: 100000,
      currentBalancePaise: 100000,
      status: "deactivated",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountPaise: 10000,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/account is deactivated/);
  });

  it("credit to account increments balance", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "CredTest",
      username: "cred_test",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "AccCred",
      type: "savings",
      openingBalancePaise: 50000,
      currentBalancePaise: 50000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "credit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountPaise: 20000,
      note: "repayment",
    });
    expect(res.status).toBe(201);
    expect(res.body.transaction.direction).toBe("credit");
    expect(stores.accounts[0].currentBalancePaise).toBe(70000);
  });

  it("handles amountRupees string conversion (1234.56 → 123456 paise)", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "RupeeTest",
      username: "rupee_test",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "RupeeAcc",
      type: "savings",
      openingBalancePaise: 200000,
      currentBalancePaise: 200000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountRupees: "1234.56",
    });
    expect(res.status).toBe(201);
    expect(res.body.transaction.amountPaise).toBe(123456);
    expect(stores.accounts[0].currentBalancePaise).toBe(200000 - 123456);
  });

  it("credit card debit respects limit and increments usedPaise", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const cardId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "CardUser",
      username: "carduser1",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.creditCards.push({
      id: cardId,
      issuer: "HDFC",
      last4: "1234",
      totalLimitPaise: 100000,
      usedPaise: 20000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "credit_card",
      sourceId: cardId,
      amountPaise: 30000,
    });
    expect(res.status).toBe(201);
    expect(stores.creditCards[0].usedPaise).toBe(50000);
  });

  it("returns 400 when card limit insufficient", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const cardId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "CardLimit",
      username: "cardlimit",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.creditCards.push({
      id: cardId,
      issuer: "ICICI",
      last4: "5678",
      totalLimitPaise: 50000,
      usedPaise: 40000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "credit_card",
      sourceId: cardId,
      amountPaise: 20000, // only 10000 available
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient card limit/);
    expect(stores.creditCards[0].usedPaise).toBe(40000);
  });

  it("reversal creates opposite transaction and adjusts account balance", async () => {
    const app = createApp();
    const customerId = randomUUID();
    const accountId = randomUUID();
    stores.customers.push({
      id: customerId,
      name: "RevTest",
      username: "rev_test",
      email: null,
      phone: null,
      notes: null,
      monthlyRateBps: 100,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    stores.accounts.push({
      id: accountId,
      name: "RevAcc",
      type: "savings",
      openingBalancePaise: 100000,
      currentBalancePaise: 100000,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // create original debit
    const createRes = await request(app).post("/api/transactions").send({
      direction: "debit",
      customerId,
      sourceType: "account",
      sourceId: accountId,
      amountPaise: 40000,
    });
    expect(createRes.status).toBe(201);
    const origId = createRes.body.transaction.id;
    expect(stores.accounts[0].currentBalancePaise).toBe(60000);

    // reverse it
    const revRes = await request(app).post(`/api/transactions/${origId}/reverse`).send();
    expect(revRes.status).toBe(201);
    expect(revRes.body.transaction.direction).toBe("credit");
    expect(revRes.body.transaction.reversedFromId).toBe(origId);
    expect(revRes.body.transaction.amountPaise).toBe(40000);
    // balance restored
    expect(stores.accounts[0].currentBalancePaise).toBe(100000);
    expect(stores.transactions.length).toBe(2);
  });
});
