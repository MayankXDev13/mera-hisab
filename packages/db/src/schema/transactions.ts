import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customers } from "./customers.js";
import { fundingSources } from "./fundingSources.js";
import { user } from "./auth.js";

export const transactionDirectionEnum = pgEnum("transaction_direction", [
  "debit",
  "credit",
]);

/**
 * direction = debit  → money lent out, exactly one sourceId (one-source-per-transaction).
 * direction = credit → repayment, sourceId is NULL and distribution lives in
 * transaction_allocations (enforced by txn_direction_source_shape below + service layer).
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    direction: transactionDirectionEnum("direction").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    customerId: uuid("customer_id").notNull(),
    sourceId: uuid("source_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("transactions_id_user_unique").on(t.id, t.userId),
    foreignKey({
      name: "txn_customer_tenant_fk",
      columns: [t.customerId, t.userId],
      foreignColumns: [customers.id, customers.userId],
    }),
    foreignKey({
      name: "txn_source_tenant_fk",
      columns: [t.sourceId, t.userId],
      foreignColumns: [fundingSources.id, fundingSources.userId],
    }),
    check(
      "txn_direction_source_shape",
      sql`(${t.direction} = 'debit' AND ${t.sourceId} IS NOT NULL) OR (${t.direction} = 'credit' AND ${t.sourceId} IS NULL)`,
    ),
    check("txn_amount_positive", sql`${t.amountPaise} > 0`),
    index("transactions_user_occurred_idx").on(t.userId, sql`${t.occurredAt} DESC`),
    index("transactions_user_customer_idx").on(t.userId, t.customerId),
    index("transactions_source_idx").on(t.sourceId),
  ],
);
