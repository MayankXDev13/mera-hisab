import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "deactivated",
]);

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
