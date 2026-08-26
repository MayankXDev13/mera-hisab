import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accounts } from "./schema/accounts.js";
import { auditLogs } from "./schema/auditLogs.js";
import { user, session, account, verification } from "./schema/auth.js";
import { creditCards } from "./schema/creditCards.js";
import { customers } from "./schema/customers.js";
import { transactions } from "./schema/transactions.js";

const drizzleSchema = {
  accounts,
  auditLogs,
  user,
  session,
  account,
  verification,
  creditCards,
  customers,
  transactions,
};

config({ path: ".env" });
config({ path: "../../.env" });

const databaseUrl = process.env.DATABASE_URL;
const isValidUrl =
  !!databaseUrl &&
  databaseUrl !== "<YOUR_DATABASE_URL>" &&
  !databaseUrl.includes("<YOUR_") &&
  (() => {
    try {
      new URL(databaseUrl);
      return true;
    } catch {
      return false;
    }
  })();

// Dummy URL for CLI generate / typecheck without real DB (no connection made until query)
const postgresUrl = isValidUrl
  ? databaseUrl!
  : "postgres://postgres:postgres@localhost:5432/postgres";

const client = postgres(postgresUrl);
export const db = drizzle({ client });
