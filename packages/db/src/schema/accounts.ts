import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["savings", "current"]);
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "deactivated",
]);

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").default("savings").notNull(),
  openingBalancePaise: integer("opening_balance_paise").notNull(),
  currentBalancePaise: integer("current_balance_paise").notNull(),
  status: accountStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
