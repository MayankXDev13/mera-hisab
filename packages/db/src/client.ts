import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(url?: string) {
  if (_db) return _db;
  const connectionString = url ?? process.env.DATABASE_URL;
  if (!connectionString) {
    // Return a dummy that throws on use – allows build without DB
    return null as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }
  const pool = new pg.Pool({ connectionString });
  _db = drizzle(pool, { schema });
  return _db;
}

export type Db = ReturnType<typeof getDb>;
