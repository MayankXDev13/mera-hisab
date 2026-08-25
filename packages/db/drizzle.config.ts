import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use DIRECT_URL (session-mode pooler / direct) for migrations so
    // prepared statements and DDL work correctly under pgbouncer.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/mera_hisab",
  },
});
