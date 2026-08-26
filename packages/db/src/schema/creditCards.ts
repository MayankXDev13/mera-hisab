import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";


export const cardStatusEnum = pgEnum("card_status", ["active", "deactivated"]);

export const creditCards = pgTable("credit_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  issuer: text("issuer").notNull(),
  last4: text("last4").notNull(),
  totalLimitPaise: integer("total_limit_paise").notNull(),
  usedPaise: integer("used_paise").default(0).notNull(),
  status: cardStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
