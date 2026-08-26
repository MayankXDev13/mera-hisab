import { describe, it, expect } from "vitest";
import { rupeesToPaise, formatRupees, paiseSchema, paisePositiveSchema, amountToPaiseOrNull, resolveAmount, MAX_PAISE_INT32 } from "@repo/schemas";

describe("@repo/schemas — deep module (TDD)", () => {
  it("rupeesToPaise converts string rupees to paise without float loss", () => {
    expect(rupeesToPaise("1234.56")).toBe(123456);
    expect(rupeesToPaise("0.50")).toBe(50);
    expect(rupeesToPaise("100")).toBe(10000);
    expect(rupeesToPaise("100.00")).toBe(10000);
    expect(rupeesToPaise(1234.56)).toBe(123456);
    expect(rupeesToPaise("0")).toBe(0);
  });

  it("rupeesToPaise handles single paise digit (1.5 → 150)", () => {
    expect(rupeesToPaise("1.5")).toBe(150);
    expect(rupeesToPaise("1.05")).toBe(105);
  });

  it("rupeesToPaise edge cases: empty, abc, negative", () => {
    expect(Number.isNaN(rupeesToPaise(""))).toBe(true);
    expect(Number.isNaN(rupeesToPaise("abc"))).toBe(true);
    expect(rupeesToPaise("-0.5")).toBe(-50);
    expect(rupeesToPaise("-10.00")).toBe(-1000);
  });

  it("formatRupees formats paise as INR", () => {
    const formatted = formatRupees(123456);
    expect(formatted).toMatch(/1,234\.56/);
    expect(formatted).toMatch(/₹/);
  });

  it("paiseSchema rejects negative and non-int", () => {
    expect(paiseSchema.safeParse(-1).success).toBe(false);
    expect(paiseSchema.safeParse(1.5).success).toBe(false);
    expect(paiseSchema.safeParse(0).success).toBe(true);
    expect(paiseSchema.safeParse(100).success).toBe(true);
  });

  it("paisePositiveSchema rejects 0", () => {
    expect(paisePositiveSchema.safeParse(0).success).toBe(false);
    expect(paisePositiveSchema.safeParse(1).success).toBe(true);
  });

  it("amountToPaiseOrNull validates format and int32 guard", () => {
    expect(amountToPaiseOrNull("500.00")).toBe(50000);
    expect(amountToPaiseOrNull("")).toBe(null);
    expect(amountToPaiseOrNull("0")).toBe(null);
    expect(amountToPaiseOrNull("0.00")).toBe(null);
    expect(amountToPaiseOrNull("abc")).toBe(null);
    expect(amountToPaiseOrNull("1.555")).toBe(null);
    expect(amountToPaiseOrNull("21474836.47")).toBe(MAX_PAISE_INT32);
    expect(amountToPaiseOrNull("21474836.48")).toBe(null);
  });

  it("resolveAmount handles xor and int32", () => {
    expect(resolveAmount({ amountPaise: 50000 })).toBe(50000);
    expect(resolveAmount({ amountPaise: 0 })).toBe(null);
    expect(resolveAmount({ amountPaise: 2147483648 })).toBe(null);
    expect(resolveAmount({ amountRupees: "100.00" })).toBe(10000);
    expect(resolveAmount({ amountRupees: "0" })).toBe(null);
    expect(resolveAmount({ amountPaise: 100, amountRupees: "1" })).toBe(null);
    expect(resolveAmount({})).toBe(null);
    expect(resolveAmount({ amountRupees: "abc" })).toBe(null);
  });
});
