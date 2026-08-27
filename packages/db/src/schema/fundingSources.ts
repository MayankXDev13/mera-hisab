import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const fundingSourceKindEnum = pgEnum("funding_source_kind", [
  "bank_account",
  "credit_card",
]);

export const fundingSourceStatusEnum = pgEnum("funding_source_status", [
  "active",
  "deactivated",
]);

export const fundingSources = pgTable(
  "funding_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    kind: fundingSourceKindEnum("kind").notNull(),

    name: text("name").notNull(),

    status: fundingSourceStatusEnum("status")
      .default("active")
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
    unique("funding_sources_id_user_unique").on(table.id, table.userId),

    index("funding_sources_user_kind_idx").on(
      table.userId,
      table.kind,
    ),
  ],
);