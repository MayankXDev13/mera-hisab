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
      .references(() => user.id, {
        onDelete: "cascade",
      }),

    customerId: uuid("customer_id").notNull(),

    direction: transactionDirectionEnum("direction").notNull(),

    amountPaise: integer("amount_paise").notNull(),

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

  (t) => [
    unique("transactions_id_user_unique").on(t.id, t.userId),

    foreignKey({
      name: "txn_customer_tenant_fk",

      columns: [t.customerId, t.userId],

      foreignColumns: [customers.id, customers.userId],
    }),

    check("txn_amount_positive", sql`${t.amountPaise} > 0`),

    index("transactions_user_occurred_idx").on(
      t.userId,
      sql`${t.occurredAt} DESC`,
    ),

    index("transactions_user_customer_idx").on(t.userId, t.customerId),
  ],
);
