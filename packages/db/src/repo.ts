import { eq, and, desc, asc, sql } from "drizzle-orm";
import type { Db } from "./client.js";
import * as schema from "./schema/index.js";

// ---------------------------------------------------------------------------
// Types exposed by the port (ISO strings for timestamps to match API)
// ---------------------------------------------------------------------------
export type Account = {
  id: string;
  name: string;
  type: "savings" | "current";
  openingBalancePaise: number;
  currentBalancePaise: number;
  status: "active" | "deactivated";
  createdAt: string;
  updatedAt: string;
};

export type CreditCard = {
  id: string;
  issuer: string;
  last4: string;
  totalLimitPaise: number;
  usedPaise: number;
  status: "active" | "deactivated";
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  monthlyRateBps: number;
  status: "active" | "deactivated";
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  direction: "debit" | "credit";
  amountPaise: number;
  customerId: string;
  sourceType: "account" | "credit_card";
  sourceId: string;
  occurredAt: string;
  note: string | null;
  createdBy: string | null;
  reversedFromId: string | null;
  monthlyChargeId: string | null;
  createdAt: string;
};

export type MonthlyCharge = {
  id: string;
  customerId: string;
  periodMonth: string;
  rateSnapshotBps: number;
  baseAmountPaise: number;
  chargeAmountPaise: number;
  status: "applied" | "waived" | "reduced";
  waivedAmountPaise: number;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: string | null;
  after: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------
export class RepoError extends Error {
  constructor(
    message: string,
    public readonly code: "Conflict" | "NotFound" | "Invalid" | "Unknown",
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RepoError";
  }
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------
export type TxFilter = {
  customerId?: string;
  sourceType?: string;
  sourceId?: string;
  direction?: string;
  from?: string;
  to?: string;
};

export type ChargeFilter = {
  customerId?: string;
  periodMonth?: string;
};

export type AuditFilter = {
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
};

// ---------------------------------------------------------------------------
// Port
// ---------------------------------------------------------------------------
export type LedgerRepo = {
  withTransaction<T>(fn: (tx: LedgerRepo) => Promise<T>): Promise<T>;

  accounts: {
    get(id: string): Promise<Account | null>;
    list(): Promise<Account[]>;
    create(a: Omit<Account, "createdAt" | "updatedAt"> & Partial<Pick<Account, "createdAt" | "updatedAt">>): Promise<Account>;
    update(id: string, patch: Partial<Pick<Account, "name" | "type" | "currentBalancePaise" | "status">>): Promise<Account>;
  };
  cards: {
    get(id: string): Promise<CreditCard | null>;
    list(): Promise<CreditCard[]>;
    create(c: Omit<CreditCard, "createdAt" | "updatedAt"> & Partial<Pick<CreditCard, "createdAt" | "updatedAt">>): Promise<CreditCard>;
    update(id: string, patch: Partial<Pick<CreditCard, "issuer" | "last4" | "totalLimitPaise" | "usedPaise" | "status">>): Promise<CreditCard>;
  };
  customers: {
    get(id: string): Promise<Customer | null>;
    getByUsername(u: string): Promise<Customer | null>;
    list(): Promise<Customer[]>;
    create(c: Omit<Customer, "createdAt" | "updatedAt"> & Partial<Pick<Customer, "createdAt" | "updatedAt">>): Promise<Customer>;
    update(id: string, patch: Partial<Pick<Customer, "name" | "username" | "email" | "phone" | "notes" | "monthlyRateBps" | "status">>): Promise<Customer>;
  };
  transactions: {
    get(id: string): Promise<Transaction | null>;
    list(filter: TxFilter): Promise<Transaction[]>;
    create(t: Omit<Transaction, "createdAt"> & Partial<Pick<Transaction, "createdAt">>): Promise<Transaction>;
  };
  charges: {
    get(id: string): Promise<MonthlyCharge | null>;
    list(filter: ChargeFilter): Promise<MonthlyCharge[]>;
    create(c: Omit<MonthlyCharge, "createdAt" | "updatedAt"> & Partial<Pick<MonthlyCharge, "createdAt" | "updatedAt">>): Promise<MonthlyCharge>;
    update(id: string, patch: Partial<Pick<MonthlyCharge, "status" | "waivedAmountPaise">>): Promise<MonthlyCharge>;
  };
  audit: {
    list(filter: AuditFilter): Promise<AuditLog[]>;
    write(entry: Omit<AuditLog, "id" | "createdAt"> & Partial<Pick<AuditLog, "id" | "createdAt">>): Promise<void>;
  };
};

// ---------------------------------------------------------------------------
// Helpers for Drizzle -> port mapping
// ---------------------------------------------------------------------------
function toIso(d: Date | string): string {
  return typeof d === "string" ? new Date(d).toISOString() : d.toISOString();
}

// ---------------------------------------------------------------------------
// Postgres adapter
// ---------------------------------------------------------------------------
export function createPgRepo(db: Db): LedgerRepo {
  const wrapTx = (txDb: Db): LedgerRepo => createPgRepo(txDb);

  const repo: LedgerRepo = {
    async withTransaction<T>(fn: (tx: LedgerRepo) => Promise<T>): Promise<T> {
      // drizzle-orm transaction
      return (db as unknown as { transaction: (cb: (tx: Db) => Promise<T>) => Promise<T> }).transaction(async (txDb: Db) => {
        const txRepo = wrapTx(txDb);
        return fn(txRepo);
      });
    },

    accounts: {
      async get(id) {
        const rows = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).limit(1);
        if (!rows[0]) return null;
        const r = rows[0];
        return {
          id: r!.id,
          name: r!.name,
          type: r!.type as Account["type"],
          openingBalancePaise: r!.openingBalancePaise,
          currentBalancePaise: r!.currentBalancePaise,
          status: r!.status as Account["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async list() {
        const rows = await db.select().from(schema.accounts).orderBy(asc(schema.accounts.createdAt));
        return rows.map((r) => ({
          id: r!.id,
          name: r!.name,
          type: r!.type as Account["type"],
          openingBalancePaise: r!.openingBalancePaise,
          currentBalancePaise: r!.currentBalancePaise,
          status: r!.status as Account["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        }));
      },
      async create(a) {
        const [r] = await db
          .insert(schema.accounts)
          .values({
            id: a.id,
            name: a.name,
            type: a.type as (typeof schema.accountTypeEnum.enumValues)[number],
            openingBalancePaise: a.openingBalancePaise,
            currentBalancePaise: a.currentBalancePaise,
            status: a.status as (typeof schema.accountStatusEnum.enumValues)[number],
          })
          .returning();
        return {
          id: r!.id,
          name: r!.name,
          type: r!.type as Account["type"],
          openingBalancePaise: r!.openingBalancePaise,
          currentBalancePaise: r!.currentBalancePaise,
          status: r!.status as Account["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async update(id, patch) {
        const [r] = await db
          .update(schema.accounts)
          .set({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.type !== undefined ? { type: patch.type as (typeof schema.accountTypeEnum.enumValues)[number] } : {}),
            ...(patch.currentBalancePaise !== undefined ? { currentBalancePaise: patch.currentBalancePaise } : {}),
            ...(patch.status !== undefined ? { status: patch.status as (typeof schema.accountStatusEnum.enumValues)[number] } : {}),
            updatedAt: new Date(),
          })
          .where(eq(schema.accounts.id, id))
          .returning();
        if (!r) throw new RepoError("account not found", "NotFound", 404);
        return {
          id: r!.id,
          name: r!.name,
          type: r!.type as Account["type"],
          openingBalancePaise: r!.openingBalancePaise,
          currentBalancePaise: r!.currentBalancePaise,
          status: r!.status as Account["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
    },

    cards: {
      async get(id) {
        const rows = await db.select().from(schema.creditCards).where(eq(schema.creditCards.id, id)).limit(1);
        if (!rows[0]) return null;
        const r = rows[0];
        return {
          id: r!.id,
          issuer: r!.issuer,
          last4: r!.last4,
          totalLimitPaise: r!.totalLimitPaise,
          usedPaise: r!.usedPaise,
          status: r!.status as CreditCard["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async list() {
        const rows = await db.select().from(schema.creditCards).orderBy(asc(schema.creditCards.createdAt));
        return rows.map((r) => ({
          id: r!.id,
          issuer: r!.issuer,
          last4: r!.last4,
          totalLimitPaise: r!.totalLimitPaise,
          usedPaise: r!.usedPaise,
          status: r!.status as CreditCard["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        }));
      },
      async create(c) {
        const [r] = await db
          .insert(schema.creditCards)
          .values({
            id: c.id,
            issuer: c.issuer,
            last4: c.last4,
            totalLimitPaise: c.totalLimitPaise,
            usedPaise: c.usedPaise,
            status: c.status as (typeof schema.cardStatusEnum.enumValues)[number],
          })
          .returning();
        return {
          id: r!.id,
          issuer: r!.issuer,
          last4: r!.last4,
          totalLimitPaise: r!.totalLimitPaise,
          usedPaise: r!.usedPaise,
          status: r!.status as CreditCard["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async update(id, patch) {
        const [r] = await db
          .update(schema.creditCards)
          .set({
            ...(patch.issuer !== undefined ? { issuer: patch.issuer } : {}),
            ...(patch.last4 !== undefined ? { last4: patch.last4 } : {}),
            ...(patch.totalLimitPaise !== undefined ? { totalLimitPaise: patch.totalLimitPaise } : {}),
            ...(patch.usedPaise !== undefined ? { usedPaise: patch.usedPaise } : {}),
            ...(patch.status !== undefined ? { status: patch.status as (typeof schema.cardStatusEnum.enumValues)[number] } : {}),
            updatedAt: new Date(),
          })
          .where(eq(schema.creditCards.id, id))
          .returning();
        if (!r) throw new RepoError("card not found", "NotFound", 404);
        return {
          id: r!.id,
          issuer: r!.issuer,
          last4: r!.last4,
          totalLimitPaise: r!.totalLimitPaise,
          usedPaise: r!.usedPaise,
          status: r!.status as CreditCard["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
    },

    customers: {
      async get(id) {
        const rows = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
        if (!rows[0]) return null;
        const r = rows[0];
        return {
          id: r!.id,
          name: r!.name,
          username: r!.username,
          email: r!.email,
          phone: r!.phone,
          notes: r!.notes,
          monthlyRateBps: r!.monthlyRateBps,
          status: r!.status as Customer["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async getByUsername(u) {
        const rows = await db.select().from(schema.customers).where(eq(schema.customers.username, u)).limit(1);
        if (!rows[0]) return null;
        const r = rows[0];
        return {
          id: r!.id,
          name: r!.name,
          username: r!.username,
          email: r!.email,
          phone: r!.phone,
          notes: r!.notes,
          monthlyRateBps: r!.monthlyRateBps,
          status: r!.status as Customer["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async list() {
        const rows = await db.select().from(schema.customers).orderBy(asc(schema.customers.createdAt));
        return rows.map((r) => ({
          id: r!.id,
          name: r!.name,
          username: r!.username,
          email: r!.email,
          phone: r!.phone,
          notes: r!.notes,
          monthlyRateBps: r!.monthlyRateBps,
          status: r!.status as Customer["status"],
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        }));
      },
      async create(c) {
        try {
          const [r] = await db
            .insert(schema.customers)
            .values({
              id: c.id,
              name: c.name,
              username: c.username,
              email: c.email,
              phone: c.phone,
              notes: c.notes,
              monthlyRateBps: c.monthlyRateBps,
              status: c.status as (typeof schema.customerStatusEnum.enumValues)[number],
            })
            .returning();
          return {
            id: r!.id,
            name: r!.name,
            username: r!.username,
            email: r!.email,
            phone: r!.phone,
            notes: r!.notes,
            monthlyRateBps: r!.monthlyRateBps,
            status: r!.status as Customer["status"],
            createdAt: toIso(r!.createdAt),
            updatedAt: toIso(r!.updatedAt),
          };
        } catch (e: unknown) {
          const msg = (e as Error).message ?? "";
          if (msg.includes("customers_username_unique") || msg.includes("duplicate key") || msg.includes("unique")) {
            throw new RepoError("username already exists", "Conflict", 409);
          }
          throw e;
        }
      },
      async update(id, patch) {
        try {
          const [r] = await db
            .update(schema.customers)
            .set({
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.username !== undefined ? { username: patch.username } : {}),
              ...(patch.email !== undefined ? { email: patch.email } : {}),
              ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
              ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
              ...(patch.monthlyRateBps !== undefined ? { monthlyRateBps: patch.monthlyRateBps } : {}),
              ...(patch.status !== undefined ? { status: patch.status as (typeof schema.customerStatusEnum.enumValues)[number] } : {}),
              updatedAt: new Date(),
            })
            .where(eq(schema.customers.id, id))
            .returning();
          if (!r) throw new RepoError("customer not found", "NotFound", 404);
          return {
            id: r!.id,
            name: r!.name,
            username: r!.username,
            email: r!.email,
            phone: r!.phone,
            notes: r!.notes,
            monthlyRateBps: r!.monthlyRateBps,
            status: r!.status as Customer["status"],
            createdAt: toIso(r!.createdAt),
            updatedAt: toIso(r!.updatedAt),
          };
        } catch (e: unknown) {
          if (e instanceof RepoError) throw e;
          const msg = (e as Error).message ?? "";
          if (msg.includes("customers_username_unique") || msg.includes("duplicate key")) {
            throw new RepoError("username already exists", "Conflict", 409);
          }
          throw e;
        }
      },
    },

    transactions: {
      async get(id) {
        const rows = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id)).limit(1);
        if (!rows[0]) return null;
        const r = rows[0];
        return {
          id: r!.id,
          direction: r!.direction as Transaction["direction"],
          amountPaise: r!.amountPaise,
          customerId: r!.customerId,
          sourceType: r!.sourceType as Transaction["sourceType"],
          sourceId: r!.sourceId,
          occurredAt: toIso(r!.occurredAt),
          note: r!.note,
          createdBy: r!.createdBy,
          reversedFromId: r!.reversedFromId,
          monthlyChargeId: r!.monthlyChargeId,
          createdAt: toIso(r!.createdAt),
        };
      },
      async list(filter) {
        let q = db.select().from(schema.transactions);
        const conditions: ReturnType<typeof eq>[] = [];
        if (filter!.customerId) conditions.push(eq(schema.transactions.customerId, filter!.customerId) as unknown as ReturnType<typeof eq>);
        if (filter!.sourceType) conditions.push(eq(schema.transactions.sourceType, filter!.sourceType as "account" | "credit_card") as unknown as ReturnType<typeof eq>);
        if (filter!.sourceId) conditions.push(eq(schema.transactions.sourceId, filter!.sourceId) as unknown as ReturnType<typeof eq>);
        if (filter!.direction) conditions.push(eq(schema.transactions.direction, filter!.direction as "debit" | "credit") as unknown as ReturnType<typeof eq>);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rows: any[];
        if (conditions.length === 1) rows = await q.where(conditions[0]!).orderBy(desc(schema.transactions.occurredAt));
        else if (conditions.length > 1) rows = await q.where(and(...conditions)).orderBy(desc(schema.transactions.occurredAt));
        else rows = await q.orderBy(desc(schema.transactions.occurredAt));
        let list: Transaction[] = rows.map((r) => ({
          id: r!.id,
          direction: r!.direction as Transaction["direction"],
          amountPaise: r!.amountPaise,
          customerId: r!.customerId,
          sourceType: r!.sourceType as Transaction["sourceType"],
          sourceId: r!.sourceId,
          occurredAt: toIso(r!.occurredAt),
          note: r!.note,
          createdBy: r!.createdBy,
          reversedFromId: r!.reversedFromId,
          monthlyChargeId: r!.monthlyChargeId,
          createdAt: toIso(r!.createdAt),
        }));
        if (filter.from) {
          const fromD = new Date(filter.from);
          list = list.filter((t) => new Date(t.occurredAt) >= fromD);
        }
        if (filter.to) {
          const toD = new Date(filter.to);
          list = list.filter((t) => new Date(t.occurredAt) <= toD);
        }
        return list;
      },
      async create(t) {
        const [r] = await db
          .insert(schema.transactions)
          .values({
            id: t.id,
            direction: t.direction as (typeof schema.transactionDirectionEnum.enumValues)[number],
            amountPaise: t.amountPaise,
            customerId: t.customerId,
            sourceType: t.sourceType as (typeof schema.sourceTypeEnum.enumValues)[number],
            sourceId: t.sourceId,
            occurredAt: new Date(t.occurredAt),
            note: t.note,
            createdBy: t.createdBy,
            reversedFromId: t.reversedFromId,
            monthlyChargeId: t.monthlyChargeId,
          })
          .returning();
        return {
          id: r!.id,
          direction: r!.direction as Transaction["direction"],
          amountPaise: r!.amountPaise,
          customerId: r!.customerId,
          sourceType: r!.sourceType as Transaction["sourceType"],
          sourceId: r!.sourceId,
          occurredAt: toIso(r!.occurredAt),
          note: r!.note,
          createdBy: r!.createdBy,
          reversedFromId: r!.reversedFromId,
          monthlyChargeId: r!.monthlyChargeId,
          createdAt: toIso(r!.createdAt),
        };
      },
    },

    charges: {
      async get(id) {
        const rows = await db.select().from(schema.monthlyCharges).where(eq(schema.monthlyCharges.id, id)).limit(1);
        if (!rows[0]) return null;
        const r = rows[0];
        return {
          id: r!.id,
          customerId: r!.customerId,
          periodMonth: r!.periodMonth,
          rateSnapshotBps: r!.rateSnapshotBps,
          baseAmountPaise: r!.baseAmountPaise,
          chargeAmountPaise: r!.chargeAmountPaise,
          status: r!.status as MonthlyCharge["status"],
          waivedAmountPaise: r!.waivedAmountPaise,
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
      async list(filter) {
        let q = db.select().from(schema.monthlyCharges);
        const conditions: ReturnType<typeof eq>[] = [];
        if (filter!.customerId) conditions.push(eq(schema.monthlyCharges.customerId, filter!.customerId) as unknown as ReturnType<typeof eq>);
        if (filter!.periodMonth) conditions.push(eq(schema.monthlyCharges.periodMonth, filter!.periodMonth) as unknown as ReturnType<typeof eq>);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rows: any[];
        if (conditions.length === 1) rows = await q.where(conditions[0]!).orderBy(desc(schema.monthlyCharges.periodMonth));
        else if (conditions.length > 1) rows = await q.where(and(...conditions)).orderBy(desc(schema.monthlyCharges.periodMonth));
        else rows = await q.orderBy(desc(schema.monthlyCharges.periodMonth));
        return rows.map((r) => ({
          id: r!.id,
          customerId: r!.customerId,
          periodMonth: r!.periodMonth,
          rateSnapshotBps: r!.rateSnapshotBps,
          baseAmountPaise: r!.baseAmountPaise,
          chargeAmountPaise: r!.chargeAmountPaise,
          status: r!.status as MonthlyCharge["status"],
          waivedAmountPaise: r!.waivedAmountPaise,
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        }));
      },
      async create(c) {
        try {
          const [r] = await db
            .insert(schema.monthlyCharges)
            .values({
              id: c.id,
              customerId: c.customerId,
              periodMonth: c.periodMonth,
              rateSnapshotBps: c.rateSnapshotBps,
              baseAmountPaise: c.baseAmountPaise,
              chargeAmountPaise: c.chargeAmountPaise,
              status: c.status as (typeof schema.chargeStatusEnum.enumValues)[number],
              waivedAmountPaise: c.waivedAmountPaise,
            })
            .returning();
          return {
            id: r!.id,
            customerId: r!.customerId,
            periodMonth: r!.periodMonth,
            rateSnapshotBps: r!.rateSnapshotBps,
            baseAmountPaise: r!.baseAmountPaise,
            chargeAmountPaise: r!.chargeAmountPaise,
            status: r!.status as MonthlyCharge["status"],
            waivedAmountPaise: r!.waivedAmountPaise,
            createdAt: toIso(r!.createdAt),
            updatedAt: toIso(r!.updatedAt),
          };
        } catch (e: unknown) {
          const msg = (e as Error).message ?? "";
          if (msg.includes("monthly_charges_customer_period_unique") || msg.includes("duplicate key")) {
            throw new RepoError("charge already exists for period", "Conflict", 409);
          }
          throw e;
        }
      },
      async update(id, patch) {
        const [r] = await db
          .update(schema.monthlyCharges)
          .set({
            ...(patch.status !== undefined ? { status: patch.status as (typeof schema.chargeStatusEnum.enumValues)[number] } : {}),
            ...(patch.waivedAmountPaise !== undefined ? { waivedAmountPaise: patch.waivedAmountPaise } : {}),
            updatedAt: new Date(),
          })
          .where(eq(schema.monthlyCharges.id, id))
          .returning();
        if (!r) throw new RepoError("charge not found", "NotFound", 404);
        return {
          id: r!.id,
          customerId: r!.customerId,
          periodMonth: r!.periodMonth,
          rateSnapshotBps: r!.rateSnapshotBps,
          baseAmountPaise: r!.baseAmountPaise,
          chargeAmountPaise: r!.chargeAmountPaise,
          status: r!.status as MonthlyCharge["status"],
          waivedAmountPaise: r!.waivedAmountPaise,
          createdAt: toIso(r!.createdAt),
          updatedAt: toIso(r!.updatedAt),
        };
      },
    },

    audit: {
      async list(filter) {
        let q = db.select().from(schema.auditLogs);
        const conditions: ReturnType<typeof eq>[] = [];
        if (filter!.entityType) conditions.push(eq(schema.auditLogs.entityType, filter!.entityType) as unknown as ReturnType<typeof eq>);
        if (filter!.entityId) conditions.push(eq(schema.auditLogs.entityId, filter!.entityId) as unknown as ReturnType<typeof eq>);
        if (filter!.action) conditions.push(eq(schema.auditLogs.action, filter!.action) as unknown as ReturnType<typeof eq>);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rows: any[];
        if (conditions.length === 1) rows = await q.where(conditions[0]!).orderBy(desc(schema.auditLogs.createdAt));
        else if (conditions.length > 1) rows = await q.where(and(...conditions)).orderBy(desc(schema.auditLogs.createdAt));
        else rows = await q.orderBy(desc(schema.auditLogs.createdAt));
        let list: AuditLog[] = rows.map((r) => ({
          id: r!.id,
          actorId: r!.actorId,
          action: r!.action,
          entityType: r!.entityType,
          entityId: r!.entityId,
          before: r!.before,
          after: r!.after,
          createdAt: toIso(r!.createdAt),
        }));
        if (filter.from) {
          const fromD = new Date(filter.from);
          list = list.filter((a) => new Date(a.createdAt) >= fromD);
        }
        if (filter.to) {
          const toD = new Date(filter.to);
          list = list.filter((a) => new Date(a.createdAt) <= toD);
        }
        return list;
      },
      async write(entry) {
        await db.insert(schema.auditLogs).values({
          id: entry.id,
          actorId: entry.actorId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: entry.before,
          after: entry.after,
        });
      },
    },
  };

  return repo;
}

// ---------------------------------------------------------------------------
// Memory adapter — mimics constraints for fast tests and dockerless env
// ---------------------------------------------------------------------------
export function createMemoryRepo(seed?: {
  accounts?: Account[];
  cards?: CreditCard[];
  customers?: Customer[];
  transactions?: Transaction[];
  charges?: MonthlyCharge[];
  auditLogs?: AuditLog[];
}): LedgerRepo {
  const accounts = new Map<string, Account>();
  const cards = new Map<string, CreditCard>();
  const customers = new Map<string, Customer>();
  const customersByUsername = new Map<string, string>();
  const transactions = new Map<string, Transaction>();
  const charges = new Map<string, MonthlyCharge>();
  const chargeKey = new Map<string, string>();
  const auditLogs: AuditLog[] = [];

  if (seed?.accounts) for (const a of seed.accounts) accounts.set(a.id, { ...a });
  if (seed?.cards) for (const c of seed.cards) cards.set(c.id, { ...c });
  if (seed?.customers)
    for (const c of seed.customers) {
      customers.set(c.id, { ...c });
      customersByUsername.set(c.username.toLowerCase(), c.id);
    }
  if (seed?.transactions) for (const t of seed.transactions) transactions.set(t.id, { ...t });
  if (seed?.charges)
    for (const c of seed.charges) {
      charges.set(c.id, { ...c });
      chargeKey.set(`${c.customerId}:${c.periodMonth}`, c.id);
    }
  if (seed?.auditLogs) auditLogs.push(...seed.auditLogs.map((a) => ({ ...a })));

  function clone(): {
    accounts: Map<string, Account>;
    cards: Map<string, CreditCard>;
    customers: Map<string, Customer>;
    customersByUsername: Map<string, string>;
    transactions: Map<string, Transaction>;
    charges: Map<string, MonthlyCharge>;
    chargeKey: Map<string, string>;
    auditLogs: AuditLog[];
  } {
    return {
      accounts: new Map(accounts),
      cards: new Map(cards),
      customers: new Map(customers),
      customersByUsername: new Map(customersByUsername),
      transactions: new Map(transactions),
      charges: new Map(charges),
      chargeKey: new Map(chargeKey),
      auditLogs: [...auditLogs],
    };
  }

  function restore(snap: ReturnType<typeof clone>) {
    accounts.clear();
    for (const [k, v] of snap.accounts) accounts.set(k, v);
    cards.clear();
    for (const [k, v] of snap.cards) cards.set(k, v);
    customers.clear();
    for (const [k, v] of snap.customers) customers.set(k, v);
    customersByUsername.clear();
    for (const [k, v] of snap.customersByUsername) customersByUsername.set(k, v);
    transactions.clear();
    for (const [k, v] of snap.transactions) transactions.set(k, v);
    charges.clear();
    for (const [k, v] of snap.charges) charges.set(k, v);
    chargeKey.clear();
    for (const [k, v] of snap.chargeKey) chargeKey.set(k, v);
    auditLogs.length = 0;
    auditLogs.push(...snap.auditLogs);
  }

  const repo: LedgerRepo = {
    async withTransaction<T>(fn: (tx: LedgerRepo) => Promise<T>): Promise<T> {
      const snap = clone();
      try {
        return await fn(repo);
      } catch (e) {
        restore(snap);
        throw e;
      }
    },

    accounts: {
      async get(id) {
        return accounts.get(id) ?? null;
      },
      async list() {
        return [...accounts.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async create(a) {
        const now = new Date().toISOString();
        const row: Account = {
          ...a,
          createdAt: a.createdAt ?? now,
          updatedAt: a.updatedAt ?? now,
        };
        accounts.set(row.id, row);
        return row;
      },
      async update(id, patch) {
        const cur = accounts.get(id);
        if (!cur) throw new RepoError("account not found", "NotFound", 404);
        const next = { ...cur, ...patch, updatedAt: new Date().toISOString() } as Account;
        accounts.set(id, next);
        return next;
      },
    },

    cards: {
      async get(id) {
        return cards.get(id) ?? null;
      },
      async list() {
        return [...cards.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async create(c) {
        const now = new Date().toISOString();
        const row: CreditCard = { ...c, createdAt: c.createdAt ?? now, updatedAt: c.updatedAt ?? now };
        cards.set(row.id, row);
        return row;
      },
      async update(id, patch) {
        const cur = cards.get(id);
        if (!cur) throw new RepoError("card not found", "NotFound", 404);
        const next = { ...cur, ...patch, updatedAt: new Date().toISOString() } as CreditCard;
        cards.set(id, next);
        return next;
      },
    },

    customers: {
      async get(id) {
        return customers.get(id) ?? null;
      },
      async getByUsername(u) {
        const id = customersByUsername.get(u.toLowerCase());
        if (!id) return null;
        return customers.get(id) ?? null;
      },
      async list() {
        return [...customers.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async create(c) {
        const lower = c.username.toLowerCase();
        if (customersByUsername.has(lower)) throw new RepoError("username already exists", "Conflict", 409);
        const now = new Date().toISOString();
        const row: Customer = { ...c, createdAt: c.createdAt ?? now, updatedAt: c.updatedAt ?? now };
        customers.set(row.id, row);
        customersByUsername.set(lower, row.id);
        return row;
      },
      async update(id, patch) {
        const cur = customers.get(id);
        if (!cur) throw new RepoError("customer not found", "NotFound", 404);
        if (patch.username !== undefined) {
          const lower = patch.username.toLowerCase();
          const existing = customersByUsername.get(lower);
          if (existing && existing !== id) throw new RepoError("username already exists", "Conflict", 409);
          customersByUsername.delete(cur!.username.toLowerCase());
          customersByUsername.set(lower, id);
        }
        const next = { ...cur, ...patch, updatedAt: new Date().toISOString() } as Customer;
        customers.set(id, next);
        return next;
      },
    },

    transactions: {
      async get(id) {
        return transactions.get(id) ?? null;
      },
      async list(filter) {
        let list = [...transactions.values()];
        if (filter!.customerId) list = list.filter((t) => t.customerId === filter!.customerId);
        if (filter!.sourceType) list = list.filter((t) => t.sourceType === filter!.sourceType);
        if (filter!.sourceId) list = list.filter((t) => t.sourceId === filter!.sourceId);
        if (filter!.direction) list = list.filter((t) => t.direction === filter!.direction);
        if (filter.from) {
          const fromD = new Date(filter.from);
          list = list.filter((t) => new Date(t.occurredAt) >= fromD);
        }
        if (filter.to) {
          const toD = new Date(filter.to);
          list = list.filter((t) => new Date(t.occurredAt) <= toD);
        }
        list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        return list;
      },
      async create(t) {
        // fake FK check
        if (!customers.has(t.customerId)) {
          const err: unknown = new Error("insert or update on table \"transactions\" violates foreign key constraint");
          throw err;
        }
        const row: Transaction = { ...t, createdAt: t.createdAt ?? new Date().toISOString() };
        transactions.set(row.id, row);
        return row;
      },
    },

    charges: {
      async get(id) {
        return charges.get(id) ?? null;
      },
      async list(filter) {
        let list = [...charges.values()];
        if (filter!.customerId) list = list.filter((c) => c.customerId === filter!.customerId);
        if (filter!.periodMonth) list = list.filter((c) => c.periodMonth === filter!.periodMonth);
        list.sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
        return list;
      },
      async create(c) {
        const key = `${c.customerId}:${c.periodMonth}`;
        if (chargeKey.has(key)) throw new RepoError("charge already exists for period", "Conflict", 409);
        const now = new Date().toISOString();
        const row: MonthlyCharge = { ...c, createdAt: c.createdAt ?? now, updatedAt: c.updatedAt ?? now };
        charges.set(row.id, row);
        chargeKey.set(key, row.id);
        return row;
      },
      async update(id, patch) {
        const cur = charges.get(id);
        if (!cur) throw new RepoError("charge not found", "NotFound", 404);
        const next = { ...cur, ...patch, updatedAt: new Date().toISOString() } as MonthlyCharge;
        charges.set(id, next);
        return next;
      },
    },

    audit: {
      async list(filter) {
        let list = [...auditLogs];
        if (filter!.entityType) list = list.filter((a) => a.entityType === filter!.entityType);
        if (filter!.entityId) list = list.filter((a) => a.entityId === filter!.entityId);
        if (filter!.action) list = list.filter((a) => a.action === filter!.action);
        if (filter.from) {
          const fromD = new Date(filter.from);
          list = list.filter((a) => new Date(a.createdAt) >= fromD);
        }
        if (filter.to) {
          const toD = new Date(filter.to);
          list = list.filter((a) => new Date(a.createdAt) <= toD);
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return list;
      },
      async write(entry) {
        const row: AuditLog = {
          id: entry.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          actorId: entry.actorId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          before: entry.before ?? null,
          after: entry.after ?? null,
          createdAt: entry.createdAt ?? new Date().toISOString(),
        };
        auditLogs.push(row);
      },
    },
  };

  return repo;
}
