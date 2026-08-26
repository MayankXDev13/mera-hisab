import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customers.js";
import { monthlyCharges } from "./monthlyCharges.js";

export const transactionDirectionEnum = pgEnum("transaction_direction", [
  "debit",
  "credit",
]);
export const sourceTypeEnum = pgEnum("source_type", ["account", "credit_card"]);

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
    createdBy: text("created_by"),
    reversedFromId: uuid("reversed_from_id"),
    monthlyChargeId: uuid("monthly_charge_id").references(() => monthlyCharges.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("transactions_customer_idx").on(t.customerId),
    index("transactions_source_idx").on(t.sourceType, t.sourceId),
    index("transactions_monthly_charge_idx").on(t.monthlyChargeId),
  ],
);
