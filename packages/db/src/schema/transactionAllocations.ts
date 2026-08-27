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
import { customers } from "./customers.js";
import { user } from "./auth.js";

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

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    foreignKey({
      name: "alloc_txn_tenant_fk",
      columns: [table.transactionId, table.userId],
      foreignColumns: [transactions.id, transactions.userId],
    }).onDelete("cascade"),

    foreignKey({
      name: "alloc_customer_tenant_fk",
      columns: [table.customerId, table.userId],
      foreignColumns: [customers.id, customers.userId],
    }),

    foreignKey({
      name: "alloc_source_tenant_fk",
      columns: [table.sourceId, table.userId],
      foreignColumns: [fundingSources.id, fundingSources.userId],
    }),

    check("alloc_amount_positive", sql`${table.amountPaise} > 0`),

    unique("alloc_txn_source_unique").on(table.transactionId, table.sourceId),

    index("alloc_user_customer_idx").on(table.userId, table.customerId),

    index("alloc_source_idx").on(table.sourceId),
  ],
);
