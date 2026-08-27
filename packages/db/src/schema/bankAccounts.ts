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

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    fundingSourceId: uuid("funding_source_id").notNull(),

    bankName: text("bank_name"),

    accountName: text("account_name"),

    last4: text("last4"),

    openingBalancePaise: integer("opening_balance_paise")
      .notNull(),

    currentBalancePaise: integer("current_balance_paise")
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
    unique("bank_accounts_id_user_unique").on(
      table.id,
      table.userId,
    ),

    unique("bank_accounts_funding_source_unique").on(
      table.fundingSourceId,
    ),

    foreignKey({
      name: "bank_account_source_tenant_fk",
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
      "bank_opening_balance_non_negative",
      sql`${table.openingBalancePaise} >= 0`,
    ),

    check(
      "bank_current_balance_non_negative",
      sql`${table.currentBalancePaise} >= 0`,
    ),

    index("bank_accounts_user_idx").on(table.userId),

    index("bank_accounts_source_idx").on(
      table.fundingSourceId,
    ),
  ],
);