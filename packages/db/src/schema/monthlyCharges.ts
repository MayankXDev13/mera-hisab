import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customers.js";

export const chargeStatusEnum = pgEnum("charge_status", [
  "applied",
  "waived",
  "reduced",
]);

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("monthly_charges_customer_period_unique").on(
      t.customerId,
      t.periodMonth,
    ),
  ],
);
