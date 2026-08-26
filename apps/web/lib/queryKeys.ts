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
    list: (filters: Record<string, unknown>) => ["transactions", "list", filters] as const,
    detail: (id: string) => ["transactions", id] as const,
  },
};
