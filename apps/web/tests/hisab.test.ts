import { describe, it, expect } from "vitest";
import { stableKey, queryKeys, invalidationForTransaction, createMemoryHisabData, httpHisabData } from "@/lib/hisab";

describe("hisab — deep module", () => {
  it("stableKey sorts keys and ignores undefined", () => {
    expect(stableKey({ b: "2", a: "1", c: undefined })).toBe("a=1&b=2");
    expect(stableKey({ customerId: "abc", page: 1 as unknown as string, limit: 20 as unknown as string })).toBe("customerId=abc&limit=20&page=1");
  });

  it("queryKeys.transactions.list is deterministic regardless of key order", () => {
    const a = queryKeys.transactions.list({ customerId: "x", page: 1, limit: 20 });
    const b = queryKeys.transactions.list({ limit: 20, page: 1, customerId: "x" });
    expect(a).toEqual(b);
  });

  it("invalidationForTransaction precise: account vs card", () => {
    const acc = invalidationForTransaction({ sourceType: "account", customerId: "c1", sourceId: "s1" });
    expect(acc.some((k) => k.join("/") === "transactions")).toBe(true);
    expect(acc.flat().join(",")).toContain("accounts");
    expect(acc.flat().join(",")).not.toContain("cards");

    const card = invalidationForTransaction({ sourceType: "credit_card", customerId: "c1", sourceId: "s1" });
    expect(card.flat().join(",")).toContain("cards");
    expect(card.flat().join(",")).not.toContain("accounts");
  });

  it("http adapter exists", () => {
    expect(typeof httpHisabData.listTransactions).toBe("function");
    expect(typeof httpHisabData.createTransaction).toBe("function");
  });

  it("in-memory adapter boundary: list and outstanding", async () => {
    const mem = createMemoryHisabData({
      customers: [{ id: "c1", name: "A", username: "a", email: null, phone: null, notes: null, monthlyRateBps: 100, status: "active", createdAt: "", updatedAt: "" }],
      transactions: [
        { id: "t1", direction: "debit", amountPaise: 50000, customerId: "c1", sourceId: "s1", occurredAt: new Date().toISOString(), note: null, createdBy: null, createdAt: "" },
      ],
    });
    const paged = await mem.listTransactions({ page: 1, limit: 10 });
    expect(paged.total).toBe(1);
    const out = await mem.getOutstanding("c1");
    expect(out.outstandingPaise).toBe(50000);
    expect(mem.calls.join("|")).toContain("listTransactions");
  });
});
