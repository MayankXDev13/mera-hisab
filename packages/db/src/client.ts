import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;

export function getDb(url?: string) {
  const connectionString = url ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return null as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }
  if (_db && !url) return _db;
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  if (!url) {
    _db = db;
    _pool = pool;
  }
  // if a custom url is passed (test db), return ephemeral instance without memoizing
  if (url) return db;
  return db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export function _resetDbForTests() {
  _db = null;
  _pool = null;
}

export type Db = ReturnType<typeof drizzle<typeof schema>>;
