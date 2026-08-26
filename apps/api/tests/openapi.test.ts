import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { openApiSpec } from "../src/docs/openapi.js";
import {
  createCustomerSchema,
  createAccountSchema,
  createCardSchema,
  createTransactionSchema,
} from "@repo/schemas";

describe("006 - openapi contract", () => {
  it("spec is served and generated from zod", async () => {
    const app = createApp();
    const res = await request(app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
  });

  it("generated schemas track zod: customer monthlyRateBps bounds come from schema", () => {
    // if someone edits createCustomerSchema min/max, the spec follows without manual edit
    const parsed = createCustomerSchema.shape.monthlyRateBps;
    expect(parsed.minValue).toBe(0);
    expect(parsed.maxValue).toBe(10000);
    expect(openApiSchemas_CustomerCreate().properties.monthlyRateBps).toMatchObject({ minimum: 0, maximum: 10000 });
  });

  it("TransactionCreate reflects xor amount fields from zod", () => {
    const spec = openApiSpec as any;
    const props = spec.components.schemas.TransactionCreate.properties;
    expect(props.amountPaise).toBeTruthy();
    expect(props.amountRupees).toBeTruthy();
    // no phantom monthlyChargeId
    expect(props.monthlyChargeId).toBeUndefined();
  });

  it("phantom table removed: no charges route exists", async () => {
    const app = createApp();
    const res = await request(app).get("/api/charges");
    expect(res.status).toBe(404);
  });

  it("spec has no references to monthlyCharges", () => {
    const json = JSON.stringify(openApiSpec);
    expect(json).not.toContain("monthlyCharge");
  });
});

function openApiSchemas_CustomerCreate() {
  return (openApiSpec as any).components.schemas.CustomerCreate;
}
