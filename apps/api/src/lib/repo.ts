import { createMemoryRepo, createPgRepo, type LedgerRepo } from "@repo/db";
import { getDb } from "@repo/db";

let _repo: LedgerRepo | null = null;

export function getRepo(): LedgerRepo {
  if (_repo) return _repo;
  const url = process.env.DATABASE_URL;
  if (url) {
    const db = getDb(url);
    if (db) {
      _repo = createPgRepo(db);
      return _repo;
    }
  }
  _repo = createMemoryRepo();
  return _repo;
}

export function setRepo(repo: LedgerRepo) {
  _repo = repo;
}

export function resetRepo() {
  _repo = null;
}
