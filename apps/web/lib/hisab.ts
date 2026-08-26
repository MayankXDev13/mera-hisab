export type HisabAccount = {
  id: string;
  name: string;
  type: "savings" | "current";
  openingBalancePaise: number;
  currentBalancePaise: number;
  status: "active" | "deactivated";
  createdAt: string;
  updatedAt: string;
};

export type HisabCard = {
  id: string;
  issuer: string;
  last4: string;
  totalLimitPaise: number;
  usedPaise: number;
  availablePaise: number;
  status: "active" | "deactivated";
  createdAt: string;
  updatedAt: string;
};

export type HisabCustomer = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  monthlyRateBps: number;
  status: "active" | "deactivated";
  createdAt: string;
  updatedAt: string;
};

export type HisabTransaction = {
  id: string;
  direction: "debit" | "credit";
  amountPaise: number;
  customerId: string;
  sourceType: "account" | "credit_card";
  sourceId: string;
  occurredAt: string;
  note: string | null;
  createdBy: string | null;
  reversedFromId: string | null;
  createdAt: string;
};

export type TransactionFilters = {
  customerId?: string;
  sourceType?: "account" | "credit_card";
  sourceId?: string;
  direction?: "debit" | "credit";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type Outstanding = { customerId: string; outstandingPaise: number };
export type PaginatedTransactions = { transactions: HisabTransaction[]; total: number; page: number; limit: number };
export type ApiError = { error: string };
export type ApiValidationError = {
  error: string;
  details?: { fieldErrors: Record<string, string[]>; formErrors: string[] };
};

export function stableKey(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return keys.map((k) => `${k}=${String(obj[k])}`).join("&");
}

export const queryKeys = {
  me: ["me"] as const,
  accounts: {
    all: ["accounts"] as const,
    detail: (id: string) => ["accounts", id] as const,
  },
  cards: {
    all: ["cards"] as const,
    detail: (id: string) => ["cards", id] as const,
  },
  customers: {
    all: ["customers"] as const,
    detail: (id: string) => ["customers", id] as const,
    outstanding: (id: string) => ["customers", id, "outstanding"] as const,
    outstandings: (ids: string[]) => ["customers", "outstandings", [...ids].sort().join(",")] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    list: (filters: Record<string, unknown>) => ["transactions", "list", stableKey(filters)] as const,
    detail: (id: string) => ["transactions", id] as const,
  },
};

export function invalidationForTransaction(vars: { sourceType: "account" | "credit_card"; customerId: string; sourceId: string }): Array<readonly string[]> {
  const base: Array<readonly string[]> = [
    queryKeys.transactions.all,
    queryKeys.customers.outstanding(vars.customerId),
  ];
  if (vars.sourceType === "account") base.push(queryKeys.accounts.all);
  else base.push(queryKeys.cards.all);
  return base;
}

// Port
export type HisabData = {
  listAccounts(): Promise<HisabAccount[]>;
  listCards(): Promise<HisabCard[]>;
  listCustomers(): Promise<HisabCustomer[]>;
  listTransactions(filters: TransactionFilters): Promise<PaginatedTransactions>;
  getOutstanding(customerId: string): Promise<Outstanding>;
  getOutstandings(ids: string[]): Promise<Record<string, number>>;
  createTransaction(data: { direction: "debit" | "credit"; customerId: string; sourceType: "account" | "credit_card"; sourceId: string; amountPaise: number; occurredAt?: string; note?: string | null }): Promise<HisabTransaction>;
  reverseTransaction(id: string): Promise<HisabTransaction>;
};

// HTTP adapter
import { api } from "@/lib/api/client";

export const httpHisabData: HisabData = {
  async listAccounts() {
    const res = await api.get<{ accounts: HisabAccount[] }>("/api/accounts");
    return res.data.accounts;
  },
  async listCards() {
    const res = await api.get<{ cards: HisabCard[] }>("/api/cards");
    return res.data.cards;
  },
  async listCustomers() {
    const res = await api.get<{ customers: HisabCustomer[] }>("/api/customers");
    return res.data.customers;
  },
  async listTransactions(filters) {
    const res = await api.get<PaginatedTransactions>("/api/transactions", { params: filters });
    return res.data;
  },
  async getOutstanding(customerId) {
    const res = await api.get<Outstanding>(`/api/customers/${customerId}/outstanding`);
    return res.data;
  },
  async getOutstandings(ids) {
    if (ids.length === 0) return {};
    const res = await api.get<{ outstandings: Record<string, number> }>("/api/customers/outstanding", { params: { ids: ids.join(",") } });
    return res.data.outstandings;
  },
  async createTransaction(data) {
    const res = await api.post<{ transaction: HisabTransaction }>("/api/transactions", data);
    return res.data.transaction;
  },
  async reverseTransaction(id) {
    const res = await api.post<{ transaction: HisabTransaction }>(`/api/transactions/${id}/reverse`);
    return res.data.transaction;
  },
};

// In-memory adapter for tests
export function createMemoryHisabData(seed: Partial<{
  accounts: HisabAccount[];
  cards: HisabCard[];
  customers: HisabCustomer[];
  transactions: HisabTransaction[];
}> = {}): HisabData & { seed: typeof seed; calls: string[] } {
  const store = {
    accounts: [...(seed.accounts ?? [])],
    cards: [...(seed.cards ?? [])],
    customers: [...(seed.customers ?? [])],
    transactions: [...(seed.transactions ?? [])],
  };
  const calls: string[] = [];
  return {
    seed: store,
    calls,
    async listAccounts() { calls.push("listAccounts"); return store.accounts; },
    async listCards() { calls.push("listCards"); return store.cards; },
    async listCustomers() { calls.push("listCustomers"); return store.customers; },
    async listTransactions(filters) {
      calls.push(`listTransactions:${stableKey(filters as Record<string, unknown>)}`);
      let rows = [...store.transactions];
      if (filters.customerId) rows = rows.filter((r) => r.customerId === filters.customerId);
      const total = rows.length;
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const paged = rows.slice((page - 1) * limit, page * limit);
      return { transactions: paged, total, page, limit };
    },
    async getOutstanding(customerId) {
      calls.push(`getOutstanding:${customerId}`);
      const sum = store.transactions.filter((t) => t.customerId === customerId).reduce((s, t) => s + (t.direction === "debit" ? t.amountPaise : -t.amountPaise), 0);
      return { customerId, outstandingPaise: sum };
    },
    async getOutstandings(ids) {
      calls.push(`getOutstandings:${ids.join(",")}`);
      const map: Record<string, number> = {};
      for (const id of ids) map[id] = 0;
      for (const t of store.transactions) if (ids.includes(t.customerId)) map[t.customerId] = (map[t.customerId] ?? 0) + (t.direction === "debit" ? t.amountPaise : -t.amountPaise);
      return map;
    },
    async createTransaction(data) {
      calls.push(`createTransaction:${data.sourceType}`);
      const row: HisabTransaction = { id: `txn_${store.transactions.length + 1}`, direction: data.direction, amountPaise: data.amountPaise, customerId: data.customerId, sourceType: data.sourceType, sourceId: data.sourceId, occurredAt: data.occurredAt ?? new Date().toISOString(), note: data.note ?? null, createdBy: null, reversedFromId: null, createdAt: new Date().toISOString() };
      store.transactions.push(row);
      return row;
    },
    async reverseTransaction(id) {
      calls.push(`reverseTransaction:${id}`);
      const orig = store.transactions.find((t) => t.id === id);
      if (!orig) throw new Error("not found");
      const rev: HisabTransaction = { ...orig, id: `rev_${id}`, direction: orig.direction === "debit" ? "credit" : "debit", reversedFromId: id, createdAt: new Date().toISOString() };
      store.transactions.push(rev);
      return rev;
    },
  };
}
