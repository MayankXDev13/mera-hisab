import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { transactions } from "./transactions.js";
import { fundingSources } from "./fundingSources.js";
import { user } from "./auth.js";

/**
 * Distributes one repayment (credit transaction, sourceId = null)
 * across the sources whose outstanding it clears.
 * user_id / customer_id are denormalized (same pattern as transactions)
 * so per-source outstanding needs no joins.
 */
export const transactionAllocations = pgTable(
  "transaction_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    transactionId: uuid("transaction_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    sourceId: uuid("source_id").notNull(),
    amountPaise: integer("amount_paise").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      name: "alloc_txn_tenant_fk",
      columns: [t.transactionId, t.userId],
      foreignColumns: [transactions.id, transactions.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "alloc_source_tenant_fk",
      columns: [t.sourceId, t.userId],
      foreignColumns: [fundingSources.id, fundingSources.userId],
    }),
    check("alloc_amount_positive", sql`${t.amountPaise} > 0`),
    // one allocation per source per repayment
    unique("alloc_txn_source_unique").on(t.transactionId, t.sourceId),
    index("alloc_user_customer_idx").on(t.userId, t.customerId),
    index("alloc_source_idx").on(t.sourceId),
  ],
);
