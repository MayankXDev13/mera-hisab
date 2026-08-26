import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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
