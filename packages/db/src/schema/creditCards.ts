import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { fundingSources } from "./fundingSources.js";
import { user } from "./auth.js";

export const creditCards = pgTable(
  "credit_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    fundingSourceId: uuid("funding_source_id").notNull(),

    issuer: text("issuer").notNull(),

    last4: text("last4"),

    totalLimitPaise: integer("total_limit_paise").notNull(),

    usedPaise: integer("used_paise")
      .default(0)
      .notNull(),

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
    unique("credit_cards_id_user_unique").on(
      table.id,
      table.userId,
    ),

    unique("credit_cards_funding_source_unique").on(
      table.fundingSourceId,
    ),

    foreignKey({
      name: "credit_card_source_tenant_fk",
      columns: [
        table.fundingSourceId,
        table.userId,
      ],
      foreignColumns: [
        fundingSources.id,
        fundingSources.userId,
      ],
    }).onDelete("cascade"),

    check(
      "credit_card_limit_positive",
      sql`${table.totalLimitPaise} > 0`,
    ),

    check(
      "credit_card_used_non_negative",
      sql`${table.usedPaise} >= 0`,
    ),

    check(
      "credit_card_used_within_limit",
      sql`${table.usedPaise} <= ${table.totalLimitPaise}`,
    ),

    index("credit_cards_user_idx").on(table.userId),

    index("credit_cards_source_idx").on(
      table.fundingSourceId,
    ),
  ],
);