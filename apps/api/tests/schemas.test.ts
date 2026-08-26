import { describe, it, expect } from "vitest";
import { rupeesToPaise, formatRupees, paiseSchema, paisePositiveSchema } from "@repo/schemas";

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
});
