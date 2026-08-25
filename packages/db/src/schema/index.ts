import { pgTable, uuid, text, integer, timestamp, pgEnum, unique, index } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const accountTypeEnum = pgEnum("account_type", ["savings", "current"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "deactivated"]);
export const cardStatusEnum = pgEnum("card_status", ["active", "deactivated"]);
export const customerStatusEnum = pgEnum("customer_status", ["active", "deactivated"]);
export const transactionDirectionEnum = pgEnum("transaction_direction", ["debit", "credit"]);
export const sourceTypeEnum = pgEnum("source_type", ["account", "credit_card"]);
export const chargeStatusEnum = pgEnum("charge_status", ["applied", "waived", "reduced"]);

// ---------------------------------------------------------------------------
// Users (Better Auth compatible)
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified").default(0).notNull(),
  name: text("name"),
  image: text("image"),
  // Better Auth core fields
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  // extension
  role: text("role").default("admin").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts_auth = pgTable("accounts_auth", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  openingBalancePaise: integer("opening_balance_paise").notNull(),
  currentBalancePaise: integer("current_balance_paise").notNull(),
  status: accountStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Credit cards
// ---------------------------------------------------------------------------
export const creditCards = pgTable("credit_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  issuer: text("issuer").notNull(),
  last4: text("last4").notNull(),
  totalLimitPaise: integer("total_limit_paise").notNull(),
  usedPaise: integer("used_paise").default(0).notNull(),
  status: cardStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  monthlyRatePct: integer("monthly_rate_pct_int").notNull().default(0), // store as basis? use integer paise? keep numeric as text for decimals
  // store rate*100 to keep decimals e.g. 2.5% => 250
  monthlyRateBps: integer("monthly_rate_bps").notNull(),
  status: customerStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    direction: transactionDirectionEnum("direction").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    reversedFromId: uuid("reversed_from_id"),
    // charge linkage
    monthlyChargeId: uuid("monthly_charge_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("transactions_customer_idx").on(t.customerId),
    index("transactions_source_idx").on(t.sourceType, t.sourceId),
  ],
);

// ---------------------------------------------------------------------------
// Monthly charges
// ---------------------------------------------------------------------------
export const monthlyCharges = pgTable(
  "monthly_charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    periodMonth: text("period_month").notNull(), // YYYY-MM
    rateSnapshotBps: integer("rate_snapshot_bps").notNull(),
    baseAmountPaise: integer("base_amount_paise").notNull(),
    chargeAmountPaise: integer("charge_amount_paise").notNull(),
    status: chargeStatusEnum("status").default("applied").notNull(),
    waivedAmountPaise: integer("waived_amount_paise").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("monthly_charges_customer_period_unique").on(t.customerId, t.periodMonth)],
);

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: text("before"), // jsonb stored as text/json
    after: text("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_logs_entity_idx").on(t.entityType, t.entityId), index("audit_logs_created_idx").on(t.createdAt)],
);
