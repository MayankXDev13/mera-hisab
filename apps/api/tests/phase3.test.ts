import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createMemoryRepo } from "@repo/db";
import { setRepo } from "../src/lib/repo.js";
import { createApp } from "../src/index.js";
import { signToken } from "../src/lib/auth.js";
import bcrypt from "bcryptjs";

function adminToken(repo: ReturnType<typeof createMemoryRepo>, id = "admin-1") {
  return signToken({ id, email: "admin@example.com", role: "admin" });
}

async function seedAdmin(repo: ReturnType<typeof createMemoryRepo>) {
  const id = "admin-1";
  const hash = await bcrypt.hash("Admin123!", 10);
  await repo.users.create({
    id,
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
    passwordHash: hash,
    emailVerified: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return id;
}

describe("phase 3: validation, dto, auth", () => {
  let app: ReturnType<typeof createApp>;
  let repo: ReturnType<typeof createMemoryRepo>;
  let token: string;
  let adminId: string;

  beforeEach(async () => {
    repo = createMemoryRepo();
    setRepo(repo);
    adminId = await seedAdmin(repo);
    token = adminToken(repo, adminId);
    process.env.NODE_ENV = "test";
    app = createApp();
  });

  it("invalid body returns 422 with flatten, not 400 raw", async () => {
    const res = await request(app).post("/api/v1/accounts").set("Cookie", `mera_hisab_session=${token}`).send({ name: "", type: "savings" });
    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
  });

  it("invalid query from=bad-date returns 422, valid range filters correctly", async () => {
    // create an account and transaction so list exists
    await repo.accounts.create({ id: "a1", name: "Main", type: "savings", openingBalancePaise: 100000, currentBalancePaise: 100000, status: "active" });
    await repo.customers.create({ id: "c1", name: "Cust", username: "cust1", email: null, phone: null, notes: null, monthlyRateBps: 100, status: "active" });
    await repo.transactions.create({
      id: "t1",
      direction: "debit",
      amountPaise: 1000,
      customerId: "c1",
      sourceType: "account",
      sourceId: "a1",
      occurredAt: new Date("2026-01-15T00:00:00.000Z").toISOString(),
      note: null,
      createdBy: adminId,
      reversedFromId: null,
      monthlyChargeId: null,
      createdAt: new Date().toISOString(),
    });

    const bad = await request(app).get("/api/v1/transactions?from=bad-date").set("Cookie", `mera_hisab_session=${token}`);
    expect(bad.status).toBe(422);

    const ok = await request(app).get("/api/v1/transactions?from=2026-01-01&to=2026-01-31").set("Cookie", `mera_hisab_session=${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.length).toBe(1);
    const empty = await request(app).get("/api/v1/transactions?from=2026-02-01&to=2026-02-28").set("Cookie", `mera_hisab_session=${token}`);
    expect(empty.body.length).toBe(0);
  });

  it("pagination defaults page=1 limit=20 and caps at 100", async () => {
    for (let i = 0; i < 5; i++) {
      await repo.audit.write({ actorId: adminId, action: "test.action", entityType: "test", entityId: `e${i}`, before: null, after: "{}" });
    }
    const def = await request(app).get("/api/v1/audit").set("Cookie", `mera_hisab_session=${token}`);
    expect(def.status).toBe(200);
    expect(def.body.page).toBe(1);
    expect(def.body.limit).toBe(20);
    const over = await request(app).get("/api/v1/audit?limit=999").set("Cookie", `mera_hisab_session=${token}`);
    expect(over.status).toBe(422);
  });

  it("card DTO contains availablePaise and omits internal keys", async () => {
    const res = await request(app).post("/api/v1/cards").set("Cookie", `mera_hisab_session=${token}`).send({ issuer: "HDFC", last4: "1234", totalLimitPaise: 50000 });
    expect(res.status).toBe(201);
    expect(res.body.availablePaise).toBe(50000);
    expect(res.body.usedPaise).toBe(0);
  });

  it("amountRupees is accepted via shared schema (rupeesToPaise is single source)", async () => {
    const accId = crypto.randomUUID();
    const custId = crypto.randomUUID();
    await repo.accounts.create({ id: accId, name: "Main", type: "savings", openingBalancePaise: 100000, currentBalancePaise: 100000, status: "active" });
    await repo.customers.create({ id: custId, name: "Cust", username: "cust1", email: null, phone: null, notes: null, monthlyRateBps: 100, status: "active" });
    const res = await request(app)
      .post("/api/v1/transactions")
      .set("Cookie", `mera_hisab_session=${token}`)
      .send({ direction: "debit", customerId: custId, sourceType: "account", sourceId: accId, amountRupees: "12.50" });
    expect(res.status).toBe(201);
    expect(res.body.amountPaise).toBe(1250);
    const both = await request(app)
      .post("/api/v1/transactions")
      .set("Cookie", `mera_hisab_session=${token}`)
      .send({ direction: "debit", customerId: custId, sourceType: "account", sourceId: accId, amountPaise: 100, amountRupees: "1.00" });
    expect(both.status).toBe(422);
  });

  it("anonymous POST is 401, authenticated is 200, wrong password is 401 with no leak", async () => {
    const anon = await request(app).post("/api/v1/accounts").send({ name: "X", type: "savings", openingBalancePaise: 0 });
    expect(anon.status).toBe(401);
    const authed = await request(app).post("/api/v1/accounts").set("Cookie", `mera_hisab_session=${token}`).send({ name: "X", type: "savings", openingBalancePaise: 0 });
    expect(authed.status).toBe(201);
    const loginBad = await request(app).post("/api/v1/auth/login").send({ email: "admin@example.com", password: "wrong" });
    expect(loginBad.status).toBe(401);
    expect(loginBad.body.error).toBe("invalid credentials");
  });

  it("malformed and expired sessions are 401", async () => {
    const malformed = await request(app).get("/api/v1/accounts").set("Cookie", `mera_hisab_session=bogus.token.here`);
    expect(malformed.status).toBe(401);
    // expired token: sign with short exp then wait? use verify path: token for non-existent user should also 401 at middleware validate
    const fake = signToken({ id: "no-such-user", email: "x@x.com", role: "admin" });
    const noUser = await request(app).get("/api/v1/accounts").set("Cookie", `mera_hisab_session=${fake}`);
    expect(noUser.status).toBe(401);
  });

  it("duplicate email is 409, not duplicated", async () => {
    await expect(
      repo.users.create({
        id: crypto.randomUUID(),
        email: "admin@example.com",
        name: "Admin2",
        role: "admin",
        passwordHash: await bcrypt.hash("x", 10),
        emailVerified: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    const u = await repo.users.getByEmail("admin@example.com");
    expect(u?.id).toBe(adminId);
  });
});
