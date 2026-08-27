import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  text,
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
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    transactionId: uuid("transaction_id").notNull(),

    fundingSourceId: uuid("funding_source_id").notNull(),

    customerId: uuid("customer_id").notNull(),

    amountPaise: integer("amount_paise").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (t) => [
    foreignKey({
      name: "allocation_transaction_tenant_fk",

      columns: [t.transactionId, t.userId],

      foreignColumns: [transactions.id, transactions.userId],
    }).onDelete("cascade"),

    foreignKey({
      name: "allocation_source_tenant_fk",

      columns: [t.fundingSourceId, t.userId],

      foreignColumns: [fundingSources.id, fundingSources.userId],
    }),

    foreignKey({
      name: "allocation_customer_tenant_fk",

      columns: [t.customerId, t.userId],

      foreignColumns: [customers.id, customers.userId],
    }),

    check("allocation_amount_positive", sql`${t.amountPaise} > 0`),

    unique("allocation_transaction_source_unique").on(
      t.transactionId,
      t.fundingSourceId,
    ),

    index("allocation_user_customer_idx").on(t.userId, t.customerId),

    index("allocation_transaction_idx").on(t.transactionId),

    index("allocation_source_idx").on(t.fundingSourceId),
  ],
);
