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
  // rate in basis points: 250 = 2.50%
  monthlyRateBps: integer("monthly_rate_bps").notNull(),
  status: customerStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
