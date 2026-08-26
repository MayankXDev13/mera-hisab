import {
  check,
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
import { user } from "./auth.js";

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "deactivated",
]);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    username: text("username").notNull(),
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
  },
  (t) => [
    index("customers_user_idx").on(t.userId),
    unique("customers_user_username_unique").on(t.userId, t.username),
    unique("customers_id_user_unique").on(t.id, t.userId),
    check("customer_rate_bps_range", sql`${t.monthlyRateBps} BETWEEN 0 AND 10000`),
  ],
);
