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

    // Required for debit.
    // NULL for credit.
    sourceId: uuid("source_id"),

    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    }).notNull(),

    note: text("note"),

    createdBy: text("created_by"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    unique("transactions_id_user_unique").on(table.id, table.userId),

    foreignKey({
      name: "txn_customer_tenant_fk",
      columns: [table.customerId, table.userId],
      foreignColumns: [customers.id, customers.userId],
    }),

    foreignKey({
      name: "txn_source_tenant_fk",
      columns: [table.sourceId, table.userId],
      foreignColumns: [fundingSources.id, fundingSources.userId],
    }),

    check(
      "txn_direction_source_shape",
      sql`
        (
          ${table.direction} = 'debit'
          AND ${table.sourceId} IS NOT NULL
        )
        OR
        (
          ${table.direction} = 'credit'
          AND ${table.sourceId} IS NULL
        )
      `,
    ),

    check("txn_amount_positive", sql`${table.amountPaise} > 0`),

    index("transactions_user_occurred_idx").on(
      table.userId,
      sql`${table.occurredAt} DESC`,
    ),

    index("transactions_user_customer_idx").on(table.userId, table.customerId),

    index("transactions_source_idx").on(table.sourceId),
  ],
);
