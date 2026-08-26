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

export const fundingSourceKindEnum = pgEnum("funding_source_kind", [
  "bank_account",
  "credit_card",
]);
export const fundingSourceStatusEnum = pgEnum("funding_source_status", [
  "active",
  "deactivated",
]);

/**
 * One table for every place money comes from.
 * kind = bank_account uses openingBalancePaise/currentBalancePaise (last4 optional identifier).
 * kind = credit_card uses issuer/last4/totalLimitPaise/usedPaise.
 * The kind-columns split is enforced by fs_kind_columns_split in the migration.
 */
export const fundingSources = pgTable(
  "funding_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: fundingSourceKindEnum("kind").notNull(),
    name: text("name").notNull(),
    status: fundingSourceStatusEnum("status").default("active").notNull(),

    // bank_account
    openingBalancePaise: integer("opening_balance_paise"),
    currentBalancePaise: integer("current_balance_paise"),

    // credit_card
    issuer: text("issuer"),
    last4: text("last4"), // allowed on both kinds (relaxed per product decision)
    totalLimitPaise: integer("total_limit_paise"),
    usedPaise: integer("used_paise"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("funding_sources_id_user_unique").on(t.id, t.userId),
    index("funding_sources_user_kind_idx").on(t.userId, t.kind),
  ],
);

// Raw SQL checks (kind split + balance domains) live in the migration file — see drizzle/*.sql.
// Kept out of drizzle check() because the multi-column null logic is unreadable there.
